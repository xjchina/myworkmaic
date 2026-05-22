/**
 * Shared model resolution utilities for API routes.
 *
 * Extracts the repeated parseModelString → resolveApiKey → resolveBaseUrl →
 * resolveProxy → getModel boilerplate into a single call.
 */

import type { NextRequest } from 'next/server';
import { getModel, getProvider, parseModelString, type ModelWithInfo } from '@/lib/ai/providers';
import type { ThinkingConfig } from '@/lib/types/provider';
import {
  getServerProviders,
  resolveApiKey,
  resolveBaseUrl,
  resolveProxy,
} from '@/lib/server/provider-config';
import { validateUrlForSSRF } from '@/lib/server/ssrf-guard';
import type { ProviderId } from '@/lib/types/provider';
import { createLogger } from '@/lib/logger';

const log = createLogger('ResolveModel');

const FALLBACK_PROVIDER_ORDER: ProviderId[] = [
  'deepseek',
  'qwen',
  'glm',
  'doubao',
  'tencent-hunyuan',
  'siliconflow',
  'openrouter',
  'kimi',
  'minimax',
  'grok',
  'openai',
  'anthropic',
  'google',
  'xiaomi',
  'ollama',
];

function pickServerFallbackModel(excludedProviderId: string): {
  providerId: ProviderId;
  modelId: string;
} | null {
  const serverProviders = getServerProviders();
  const available = Object.keys(serverProviders) as ProviderId[];
  if (available.length === 0) return null;

  const orderedCandidates: ProviderId[] = [
    ...FALLBACK_PROVIDER_ORDER.filter((id) => available.includes(id)),
    ...available.filter((id) => !FALLBACK_PROVIDER_ORDER.includes(id)),
  ];

  for (const providerId of orderedCandidates) {
    if (providerId === excludedProviderId) continue;
    const serverEntry = serverProviders[providerId];
    const modelId = serverEntry?.models?.[0] || getProvider(providerId)?.models?.[0]?.id;
    if (!modelId) continue;

    const key = resolveApiKey(providerId, '');
    if (!key && providerId !== 'ollama') continue;

    return { providerId, modelId };
  }

  return null;
}

function normalizeMisconfiguredBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return baseUrl;
  const trimmed = baseUrl.trim();
  if (!trimmed) return undefined;
  // Common misconfiguration: setting full chat endpoint as base URL.
  // SDK expects host/api-base (e.g. https://api.deepseek.com/v1), not /chat/completions.
  return trimmed.replace(/\/chat\/completions\/?$/i, '');
}

export interface ResolvedModel extends ModelWithInfo {
  /** Original model string (e.g. "openai/gpt-4o-mini") */
  modelString: string;
  /** Resolved provider ID (e.g. "openai", "ollama") */
  providerId: string;
  /** Effective API key after server-side fallback resolution */
  apiKey: string;
  /** Optional per-request thinking configuration from the client. */
  thinkingConfig?: ThinkingConfig;
}

/**
 * Resolve a language model from explicit parameters.
 *
 * Use this when model config comes from the request body.
 */
export async function resolveModel(params: {
  modelString?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
  thinkingConfig?: ThinkingConfig;
  /**
   * Whether to allow server-side provider/apiKey/baseUrl fallback.
   * Default: true (backward-compatible).
   */
  allowServerFallback?: boolean;
}): Promise<ResolvedModel> {
  const fallbackDefaultModel =
    process.env.DEFAULT_MODEL ||
    (process.env.DEEPSEEK_API_KEY ? 'deepseek:deepseek-v4-flash' : 'gpt-5.4-mini');
  const initialModelString = params.modelString || fallbackDefaultModel;
  let { providerId, modelId } = parseModelString(initialModelString);

  // SSRF validation applies only to client-supplied base URLs.
  // Server-configured URLs (e.g. OLLAMA_BASE_URL from env/YAML) flow through
  // resolveBaseUrl() and bypass this check — they're trusted by the operator.
  const clientBaseUrl = params.baseUrl || undefined;
  if (clientBaseUrl && process.env.NODE_ENV === 'production') {
    const ssrfError = await validateUrlForSSRF(clientBaseUrl);
    if (ssrfError) {
      throw new Error(ssrfError);
    }
  }

  const allowServerFallback = params.allowServerFallback ?? true;
  let apiKey = clientBaseUrl
    ? params.apiKey || ''
    : allowServerFallback
      ? resolveApiKey(providerId, params.apiKey || '')
      : (params.apiKey || '');
  let modelString = initialModelString;

  // If current provider has no usable key, auto-fallback to a server-configured provider
  // (prefer deepseek). This avoids "API key required for provider: openai" when only
  // server-side DeepSeek credentials are configured.
  if (allowServerFallback && !clientBaseUrl && !params.apiKey && !apiKey) {
    const fallback = pickServerFallbackModel(providerId);
    if (fallback) {
      providerId = fallback.providerId;
      modelId = fallback.modelId;
      modelString = `${providerId}:${modelId}`;
      apiKey = resolveApiKey(providerId, '');
      log.info(`Auto-fallback model resolved to ${modelString}`);
    }
  }

  const baseUrl = normalizeMisconfiguredBaseUrl(
    clientBaseUrl
      ? clientBaseUrl
      : allowServerFallback
        ? resolveBaseUrl(providerId, params.baseUrl)
        : params.baseUrl,
  );
  const proxy = resolveProxy(providerId);
  const { model, modelInfo } = getModel({
    providerId,
    modelId,
    apiKey,
    baseUrl,
    proxy,
    providerType: params.providerType as 'openai' | 'anthropic' | 'google' | undefined,
  });

  return {
    model,
    modelInfo,
    modelString,
    providerId,
    apiKey,
    thinkingConfig: params.thinkingConfig,
  };
}

function getThinkingConfigFromBody(body: unknown): ThinkingConfig | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as { thinkingConfig?: unknown; thinking?: unknown };
  const config = record.thinkingConfig ?? record.thinking;
  return config && typeof config === 'object' ? (config as ThinkingConfig) : undefined;
}

/**
 * Resolve a language model from standard request headers.
 *
 * Reads: x-model, x-api-key, x-base-url, x-provider-type
 * Note: requiresApiKey is derived server-side from the provider registry,
 * never from client headers, to prevent auth bypass.
 */
export async function resolveModelFromHeaders(
  req: NextRequest,
  options?: { allowServerFallback?: boolean },
): Promise<ResolvedModel> {
  return resolveModel({
    modelString: req.headers.get('x-model') || undefined,
    apiKey: req.headers.get('x-api-key') || undefined,
    baseUrl: req.headers.get('x-base-url') || undefined,
    providerType: req.headers.get('x-provider-type') || undefined,
    allowServerFallback: options?.allowServerFallback,
  });
}

/**
 * Resolve a language model from standard request headers plus body fields.
 *
 * Reads model credentials from headers and per-request thinking config from
 * the JSON body field `thinkingConfig` (or legacy/eval field `thinking`).
 */
export async function resolveModelFromRequest(
  req: NextRequest,
  body: unknown,
  options?: { allowServerFallback?: boolean },
): Promise<ResolvedModel> {
  const resolved = await resolveModelFromHeaders(req, options);
  return {
    ...resolved,
    thinkingConfig: getThinkingConfigFromBody(body) ?? resolved.thinkingConfig,
  };
}

import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';

type ComplianceProvider = 'none' | 'aliyun';

export interface ComplianceCheckOptions {
  content: string;
  scene?: string;
  userId?: string;
  service?: string;
  dataId?: string;
}

export interface ComplianceCheckResult {
  ok: boolean;
  blocked: boolean;
  provider: ComplianceProvider;
  suggestion: 'pass' | 'review' | 'block' | 'unknown';
  labels: string[];
  reason?: string;
  raw?: unknown;
}

const log = createLogger('ContentCompliance');
const MAX_TEXT_LENGTH = 5000;
const DEFAULT_TEXT_SERVICE = 'comment_detection';
const BLOCK_SUGGESTIONS = new Set(['block', 'review', 'reject', 'forbidden', 'deny']);
const PASS_SUGGESTIONS = new Set(['pass', 'ok', 'normal', 'allow']);

function getProvider(): ComplianceProvider {
  const raw = (process.env.COMPLIANCE_PROVIDER || '').trim().toLowerCase();
  if (raw === 'aliyun') return 'aliyun';
  return 'none';
}

function shouldFailOpen(): boolean {
  return (process.env.COMPLIANCE_FAIL_OPEN || 'true').trim().toLowerCase() !== 'false';
}

function normalizeEndpoint(endpoint: string): string {
  if (!endpoint) return '';
  return endpoint.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function buildAliyunConfig() {
  const accessKeyId =
    process.env.ALIYUN_ACCESS_KEY_ID?.trim() || process.env.ALIBABA_CLOUD_ACCESS_KEY_ID?.trim() || '';
  const accessKeySecret =
    process.env.ALIYUN_ACCESS_KEY_SECRET?.trim() ||
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET?.trim() ||
    '';
  const endpoint = normalizeEndpoint(process.env.ALIYUN_GREEN_ENDPOINT?.trim() || '');
  const timeoutMs = Number(process.env.ALIYUN_GREEN_TIMEOUT_MS || 15000);

  return {
    accessKeyId,
    accessKeySecret,
    endpoint,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
  };
}

function collectStrings(input: unknown, acc: string[] = []): string[] {
  if (typeof input === 'string') {
    acc.push(input);
    return acc;
  }
  if (Array.isArray(input)) {
    input.forEach((item) => collectStrings(item, acc));
    return acc;
  }
  if (input && typeof input === 'object') {
    Object.values(input).forEach((v) => collectStrings(v, acc));
  }
  return acc;
}

function lower(v: string): string {
  return v.trim().toLowerCase();
}

function parseAliyunDecision(payload: unknown): {
  suggestion: 'pass' | 'review' | 'block' | 'unknown';
  labels: string[];
} {
  const labels = new Set<string>();
  const suggestions: string[] = [];

  const walk = (node: unknown) => {
    if (!node) return;
    if (typeof node === 'string') {
      const trimmed = node.trim();
      const l = lower(trimmed);
      if (BLOCK_SUGGESTIONS.has(l) || PASS_SUGGESTIONS.has(l)) {
        suggestions.push(l);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'object') {
      const record = node as Record<string, unknown>;
      for (const [key, val] of Object.entries(record)) {
        const lk = key.toLowerCase();
        if (lk === 'suggestion' || lk === 'action' || lk === 'conclusion') {
          if (typeof val === 'string') suggestions.push(lower(val));
        }
        if (lk === 'label' || lk === 'sublabel') {
          if (typeof val === 'string' && val.trim()) labels.add(val.trim());
        }
        walk(val);
      }
    }
  };

  walk(payload);

  if (suggestions.some((s) => BLOCK_SUGGESTIONS.has(s))) {
    return { suggestion: 'block', labels: Array.from(labels) };
  }
  if (suggestions.some((s) => PASS_SUGGESTIONS.has(s))) {
    return { suggestion: 'pass', labels: Array.from(labels) };
  }
  return { suggestion: 'unknown', labels: Array.from(labels) };
}

function truncateInput(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= MAX_TEXT_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_TEXT_LENGTH);
}

async function callAliyunTextModeration(args: {
  content: string;
  service: string;
  dataId: string;
}): Promise<unknown> {
  const conf = buildAliyunConfig();
  if (!conf.accessKeyId || !conf.accessKeySecret || !conf.endpoint) {
    throw new Error('阿里云内容审核配置不完整');
  }

  const imported = (await import('@alicloud/pop-core')) as unknown as {
    default?: new (config: Record<string, unknown>) => {
      request: (
        action: string,
        params: Record<string, string>,
        options?: Record<string, unknown>,
      ) => Promise<unknown>;
    };
  };
  const RPCClient = imported.default || (imported as unknown as typeof imported.default);
  if (!RPCClient) {
    throw new Error('无法加载 @alicloud/pop-core');
  }

  const client = new RPCClient({
    accessKeyId: conf.accessKeyId,
    accessKeySecret: conf.accessKeySecret,
    endpoint: `https://${conf.endpoint}`,
    apiVersion: '2022-03-02',
    opts: { timeout: conf.timeoutMs },
  });

  const params = {
    Service: args.service,
    ServiceParameters: JSON.stringify({
      content: args.content,
      dataId: args.dataId,
    }),
  };

  return client.request('TextModeration', params, { method: 'POST', timeout: conf.timeoutMs });
}

export async function checkContentCompliance(
  options: ComplianceCheckOptions,
): Promise<ComplianceCheckResult> {
  const provider = getProvider();
  const content = truncateInput(options.content || '');
  if (!content) {
    return {
      ok: true,
      blocked: false,
      provider,
      suggestion: 'pass',
      labels: [],
    };
  }

  if (provider === 'none') {
    return {
      ok: true,
      blocked: false,
      provider,
      suggestion: 'pass',
      labels: [],
    };
  }

  const service =
    options.service?.trim() ||
    process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() ||
    DEFAULT_TEXT_SERVICE;
  const dataId = options.dataId || `${options.scene || 'input'}-${randomUUID()}`;

  try {
    const raw = await callAliyunTextModeration({
      content,
      service,
      dataId,
    });

    const { suggestion, labels } = parseAliyunDecision(raw);
    const blocked = suggestion === 'block' || suggestion === 'review';
    return {
      ok: !blocked,
      blocked,
      provider,
      suggestion,
      labels,
      reason: blocked ? '内容未通过审核' : undefined,
      raw,
    };
  } catch (error) {
    const failOpen = shouldFailOpen();
    log.error(`内容审核请求失败(scene=${options.scene || 'unknown'})`, error);
    if (failOpen) {
      return {
        ok: true,
        blocked: false,
        provider,
        suggestion: 'unknown',
        labels: [],
      };
    }
    return {
      ok: false,
      blocked: true,
      provider,
      suggestion: 'unknown',
      labels: [],
      reason: '内容审核服务暂不可用',
    };
  }
}

export async function checkCombinedCompliance(options: {
  inputs: Array<string | undefined | null>;
  scene?: string;
  userId?: string;
  service?: string;
}): Promise<ComplianceCheckResult> {
  const merged = options.inputs
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .join('\n');
  return checkContentCompliance({
    content: merged,
    scene: options.scene,
    userId: options.userId,
    service: options.service,
  });
}

export function extractUserText(value: unknown): string[] {
  return collectStrings(value).filter((v) => v.trim().length > 0);
}


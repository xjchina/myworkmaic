import { useSettingsStore } from '@/lib/store/settings';
import type { ProviderId } from '@/lib/types/provider';
import {
  getThinkingConfigKey,
  normalizeThinkingConfig,
  supportsConfigurableThinking,
} from '@/lib/ai/thinking-config';
import type { ProviderSettings } from '@/lib/types/settings';

function isProviderReady(config: ProviderSettings | undefined): boolean {
  if (!config) return false;

  const hasEndpoint = !!(
    config.baseUrl?.trim() ||
    config.defaultBaseUrl?.trim() ||
    config.serverBaseUrl?.trim()
  );
  if (!hasEndpoint) return false;

  if (!config.requiresApiKey) return true;
  return !!(config.apiKey?.trim() || config.isServerConfigured);
}

function isClientProviderReady(config: ProviderSettings | undefined): boolean {
  if (!config) return false;

  const hasEndpoint = !!(config.baseUrl?.trim() || config.defaultBaseUrl?.trim());
  if (!hasEndpoint) return false;

  if (!config.requiresApiKey) return true;
  return !!config.apiKey?.trim();
}

function getFirstModelId(config: ProviderSettings | undefined): string {
  if (!config?.models?.length) return '';
  if (config.serverModels?.length) {
    const serverModel = config.models.find((model) => model.id === config.serverModels?.[0]);
    return serverModel?.id || config.serverModels[0] || config.models[0]?.id || '';
  }
  return config.models[0]?.id || '';
}

export function hasUsableCurrentLanguageModel(): boolean {
  const { providerId, modelId, providersConfig } = useSettingsStore.getState();
  if (!providerId || !modelId) return false;

  const providerConfig = providersConfig[providerId];
  if (!isProviderReady(providerConfig)) return false;
  return providerConfig.models.some((model) => model.id === modelId);
}

export async function ensureLanguageModelReady(): Promise<boolean> {
  const store = useSettingsStore.getState();
  await store.fetchServerProviders();

  const latest = useSettingsStore.getState();
  if (hasUsableCurrentLanguageModel()) return true;

  for (const [providerId, config] of Object.entries(latest.providersConfig)) {
    if (!isProviderReady(config)) continue;
    const modelId = getFirstModelId(config);
    if (!modelId) continue;
    latest.setModel(providerId as ProviderId, modelId);
    return true;
  }

  return false;
}

export function hasClientConfiguredCurrentLanguageModel(): boolean {
  const { providerId, modelId, providersConfig } = useSettingsStore.getState();
  if (!providerId || !modelId) return false;

  const providerConfig = providersConfig[providerId];
  if (!isClientProviderReady(providerConfig)) return false;
  return providerConfig.models.some((model) => model.id === modelId);
}

export async function ensureClientLanguageModelReady(): Promise<boolean> {
  const store = useSettingsStore.getState();
  await store.fetchServerProviders();

  const latest = useSettingsStore.getState();
  if (hasClientConfiguredCurrentLanguageModel()) return true;

  for (const [providerId, config] of Object.entries(latest.providersConfig)) {
    if (!isClientProviderReady(config)) continue;
    const modelId = getFirstModelId(config);
    if (!modelId) continue;
    latest.setModel(providerId as ProviderId, modelId);
    return true;
  }

  return false;
}

/**
 * Get current model configuration from settings store
 */
export function getCurrentModelConfig() {
  const { providerId, modelId, providersConfig, thinkingConfigs } = useSettingsStore.getState();
  const modelString = `${providerId}:${modelId}`;

  // Get current provider's config
  const providerConfig = providersConfig[providerId];
  const modelInfo = providerConfig?.models.find((model) => model.id === modelId);
  const thinking = modelInfo?.capabilities?.thinking;
  const thinkingConfig = supportsConfigurableThinking(thinking)
    ? normalizeThinkingConfig(thinking, thinkingConfigs[getThinkingConfigKey(providerId, modelId)])
    : undefined;

  return {
    providerId,
    modelId,
    modelString,
    apiKey: providerConfig?.apiKey || '',
    baseUrl: providerConfig?.baseUrl || '',
    providerType: providerConfig?.type,
    requiresApiKey: providerConfig?.requiresApiKey,
    isServerConfigured: providerConfig?.isServerConfigured,
    thinkingConfig,
  };
}

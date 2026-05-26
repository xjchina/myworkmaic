import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireOpsAdmin } from '@/lib/server/ops-auth';
import {
  getServerASRProviders,
  getServerImageProviders,
  getServerPDFProviders,
  getServerProviders,
  getServerTTSProviders,
  getServerVideoProviders,
  getServerWebSearchProviders,
  refreshServerProviderConfigCache,
} from '@/lib/server/provider-config';

export const dynamic = 'force-dynamic';

type GroupKey = 'llm' | 'asr' | 'tts' | 'ocr' | 'image' | 'video' | 'webSearch';
type YamlSectionKey = 'providers' | 'asr' | 'tts' | 'pdf' | 'image' | 'video' | 'web-search';

type YamlProviderEntry = {
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  proxy?: string;
};

type YamlDefaultRoute = {
  llm?: string;
  asr?: string;
  tts?: string;
  ocr?: string;
};

type YamlConfig = Partial<{
  providers: Record<string, YamlProviderEntry>;
  asr: Record<string, YamlProviderEntry>;
  tts: Record<string, YamlProviderEntry>;
  pdf: Record<string, YamlProviderEntry>;
  image: Record<string, YamlProviderEntry>;
  video: Record<string, YamlProviderEntry>;
  'web-search': Record<string, YamlProviderEntry>;
  'default-route': YamlDefaultRoute;
}>;

const CONFIG_FILE = path.join(process.cwd(), 'server-providers.yml');
const GROUP_TO_SECTION: Record<GroupKey, YamlSectionKey> = {
  llm: 'providers',
  asr: 'asr',
  tts: 'tts',
  ocr: 'pdf',
  image: 'image',
  video: 'video',
  webSearch: 'web-search',
};

function withHealth<T extends Record<string, unknown>>(input: Record<string, T>) {
  return Object.entries(input).map(([id, item]) => ({
    id,
    config: item,
    health: 'configured' as const,
  }));
}

async function readConfig(): Promise<YamlConfig> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf8');
    const parsed = yaml.load(content);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as YamlConfig;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeConfig(config: YamlConfig): Promise<void> {
  const serialized = yaml.dump(config, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: true,
  });
  await fs.writeFile(CONFIG_FILE, serialized, 'utf8');
}

function normalizeStr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function normalizeModels(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const models = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return models.length > 0 ? models : [];
  }
  if (typeof value === 'string') {
    const models = value
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return models.length > 0 ? models : [];
  }
  return undefined;
}

function getSection(config: YamlConfig, key: YamlSectionKey): Record<string, YamlProviderEntry> {
  const section = config[key];
  if (section && typeof section === 'object') return section as Record<string, YamlProviderEntry>;
  const next: Record<string, YamlProviderEntry> = {};
  config[key] = next;
  return next;
}

function cleanupEntry(entry: YamlProviderEntry): YamlProviderEntry | null {
  const next: YamlProviderEntry = {};
  if (entry.apiKey) next.apiKey = entry.apiKey;
  if (entry.baseUrl) next.baseUrl = entry.baseUrl;
  if (entry.proxy) next.proxy = entry.proxy;
  if (entry.models && entry.models.length > 0) next.models = entry.models;
  return Object.keys(next).length > 0 ? next : null;
}

function resolveDefaultRoute(config: YamlConfig) {
  const route = config['default-route'] || {};
  return {
    llm: route.llm || process.env.DEFAULT_LLM_PROVIDER || null,
    asr: route.asr || process.env.DEFAULT_ASR_PROVIDER || null,
    tts: route.tts || process.env.DEFAULT_TTS_PROVIDER || null,
    ocr: route.ocr || process.env.DEFAULT_OCR_PROVIDER || null,
  };
}

export async function GET() {
  try {
    const auth = await requireOpsAdmin();
    if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

    const config = await readConfig();
    const llm = withHealth(getServerProviders());
    const asr = withHealth(getServerASRProviders());
    const tts = withHealth(getServerTTSProviders());
    const ocr = withHealth(getServerPDFProviders());
    const image = withHealth(getServerImageProviders());
    const video = withHealth(getServerVideoProviders());
    const webSearch = withHealth(getServerWebSearchProviders());

    return apiSuccess({
      defaultRoute: resolveDefaultRoute(config),
      providers: { llm, asr, tts, ocr, image, video, webSearch },
    });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : '读取模型配置失败',
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireOpsAdmin();
    if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

    const body = (await request.json()) as {
      group?: GroupKey;
      id?: string;
      apiKey?: string;
      baseUrl?: string;
      models?: string | string[];
      proxy?: string;
    };
    const group = body.group;
    const id = normalizeStr(body.id);
    if (!group || !(group in GROUP_TO_SECTION) || !id) {
      return apiError('INVALID_REQUEST', 400, '缺少提供方类型或提供方 ID');
    }

    const config = await readConfig();
    const section = getSection(config, GROUP_TO_SECTION[group]);
    const current = section[id] || {};

    const apiKey = normalizeStr(body.apiKey);
    if (typeof body.apiKey === 'string') {
      if (apiKey) current.apiKey = apiKey;
      else delete current.apiKey;
    }

    const baseUrl = normalizeStr(body.baseUrl);
    if (typeof body.baseUrl === 'string') {
      if (baseUrl) current.baseUrl = baseUrl;
      else delete current.baseUrl;
    }

    const proxy = normalizeStr(body.proxy);
    if (typeof body.proxy === 'string') {
      if (proxy) current.proxy = proxy;
      else delete current.proxy;
    }

    const models = normalizeModels(body.models);
    if (models) {
      if (models.length > 0) current.models = models;
      else delete current.models;
    }

    const cleaned = cleanupEntry(current);
    if (cleaned) section[id] = cleaned;
    else delete section[id];

    await writeConfig(config);
    refreshServerProviderConfigCache();
    return apiSuccess({ updated: true });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : '保存模型配置失败',
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireOpsAdmin();
    if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

    const body = (await request.json()) as { group?: GroupKey; id?: string };
    const group = body.group;
    const id = normalizeStr(body.id);
    if (!group || !(group in GROUP_TO_SECTION) || !id) {
      return apiError('INVALID_REQUEST', 400, '缺少提供方类型或提供方 ID');
    }

    const config = await readConfig();
    const section = getSection(config, GROUP_TO_SECTION[group]);
    delete section[id];
    await writeConfig(config);
    refreshServerProviderConfigCache();
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : '删除提供方失败',
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireOpsAdmin();
    if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

    const body = (await request.json()) as { defaultRoute?: YamlDefaultRoute };
    const route = body.defaultRoute;
    if (!route || typeof route !== 'object') {
      return apiError('INVALID_REQUEST', 400, '缺少默认路由配置');
    }

    const config = await readConfig();
    const nextRoute: YamlDefaultRoute = {};
    const llm = normalizeStr(route.llm);
    const asr = normalizeStr(route.asr);
    const tts = normalizeStr(route.tts);
    const ocr = normalizeStr(route.ocr);
    if (llm) nextRoute.llm = llm;
    if (asr) nextRoute.asr = asr;
    if (tts) nextRoute.tts = tts;
    if (ocr) nextRoute.ocr = ocr;

    if (Object.keys(nextRoute).length > 0) config['default-route'] = nextRoute;
    else delete config['default-route'];

    await writeConfig(config);
    refreshServerProviderConfigCache();
    return apiSuccess({ updated: true });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : '保存默认路由失败',
    );
  }
}

import { NextRequest } from 'next/server';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';

export const runtime = 'nodejs';

const BAIDU_TOKEN_ENDPOINT = 'https://aip.baidubce.com/oauth/2.0/token';
const BAIDU_OCR_ENDPOINT = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic';
const DEEPSEEK_DEFAULT_BASE = 'https://api.deepseek.com';

type StepKey =
  | 'step1'
  | 'step2Mistake'
  | 'step2Focus'
  | 'step3'
  | 'step4Type'
  | 'step4Condition'
  | 'step4Goal'
  | 'step4Steps'
  | 'step5';

type StepData = Record<StepKey, string>;

const STEP_KEYS: StepKey[] = [
  'step1',
  'step2Mistake',
  'step2Focus',
  'step3',
  'step4Type',
  'step4Condition',
  'step4Goal',
  'step4Steps',
  'step5',
];

const EMPTY_STEPS: StepData = {
  step1: '',
  step2Mistake: '',
  step2Focus: '',
  step3: '',
  step4Type: '',
  step4Condition: '',
  step4Goal: '',
  step4Steps: '',
  step5: '',
};

let cachedBaiduToken: string | null = null;
let cachedBaiduTokenExpiresAt = 0;

interface OcrRequestBody {
  image?: string;
  mimeType?: string;
}

interface BaiduTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface BaiduOcrResponse {
  error_code?: number;
  error_msg?: string;
  words_result?: Array<{ words?: string }>;
}

function sanitizeBase64(value: string): string {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(',');
  const payload = commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
  return payload.replace(/\s+/g, '');
}

function truncate(text: string, max = 400): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.replace(/\s+/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
}

function pickLines(lines: string[], keywords: string[]): string[] {
  return lines.filter((line) => keywords.some((kw) => line.includes(kw)));
}

function joinTop(lines: string[], top = 3): string {
  return uniqueLines(lines).slice(0, top).join('；');
}

function safeStepData(candidate: unknown): StepData {
  const base: StepData = { ...EMPTY_STEPS };
  if (!candidate || typeof candidate !== 'object') return base;
  const data = candidate as Record<string, unknown>;
  for (const key of STEP_KEYS) {
    const raw = data[key];
    if (typeof raw === 'string') {
      base[key] = truncate(raw.trim(), 800);
    }
  }
  return base;
}

function mergeSteps(primary: StepData, fallback: StepData): StepData {
  const merged: StepData = { ...EMPTY_STEPS };
  for (const key of STEP_KEYS) {
    merged[key] = primary[key] || fallback[key] || '';
  }
  return merged;
}

function buildHeuristicSteps(rawText: string): StepData {
  const lines = uniqueLines(
    rawText
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  const coreLines = pickLines(lines, ['概念', '定义', '性质', '原理', '含义', '本质']);
  const mistakeLines = pickLines(lines, ['易错', '错误', '注意', '陷阱', '误区']);
  const focusLines = pickLines(lines, ['重点', '关键', '考点', '高频', '掌握']);
  const formulaLines = pickLines(lines, ['公式', '定理', '=', '≥', '≤', '≠', '+', '-', '×', '÷', '^']);
  const exampleLines = pickLines(lines, ['例', '题', '已知', '求', '解', '步骤', '证明']);
  const summaryLines = pickLines(lines, ['总结', '方法', '思路', '技巧', '归纳', '复盘']);

  const untouchedLines = lines.filter(
    (line) =>
      !coreLines.includes(line) &&
      !mistakeLines.includes(line) &&
      !focusLines.includes(line) &&
      !formulaLines.includes(line) &&
      !exampleLines.includes(line) &&
      !summaryLines.includes(line),
  );

  const step4Condition = joinTop(
    exampleLines.filter((line) => /已知|条件|设|给定/.test(line)),
    2,
  );
  const step4Goal = joinTop(
    exampleLines.filter((line) => /求|证明|判断|比较|化简|计算/.test(line)),
    2,
  );
  const step4Steps = joinTop(
    exampleLines.filter((line) => /步骤|先|再|然后|最后|由此/.test(line)),
    3,
  );

  return {
    step1: joinTop(coreLines, 3) || joinTop(untouchedLines, 3),
    step2Mistake: joinTop(mistakeLines, 2),
    step2Focus: joinTop(focusLines, 3),
    step3: joinTop(formulaLines, 4),
    step4Type: joinTop(exampleLines.filter((line) => /题型|例题|类型|应用/.test(line)), 2) || joinTop(exampleLines, 2),
    step4Condition,
    step4Goal,
    step4Steps,
    step5: joinTop(summaryLines, 3),
  };
}

async function getBaiduAccessToken(apiKey: string, secretKey: string): Promise<string> {
  const now = Date.now();
  if (cachedBaiduToken && now < cachedBaiduTokenExpiresAt) {
    return cachedBaiduToken;
  }

  const url = new URL(BAIDU_TOKEN_ENDPOINT);
  url.searchParams.set('grant_type', 'client_credentials');
  url.searchParams.set('client_id', apiKey);
  url.searchParams.set('client_secret', secretKey);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(15000),
  });

  const payload = (await response.json()) as BaiduTokenResponse;
  if (!response.ok || !payload.access_token) {
    const detail = payload.error_description || payload.error || '百度 OCR 鉴权失败';
    throw new Error(detail);
  }

  const expiresInSeconds = Math.max(60, payload.expires_in ?? 2592000);
  cachedBaiduToken = payload.access_token;
  cachedBaiduTokenExpiresAt = now + (expiresInSeconds - 120) * 1000;
  return payload.access_token;
}

async function runBaiduOcr(imageBase64: string, accessToken: string): Promise<string> {
  const body = new URLSearchParams();
  body.set('image', imageBase64);
  body.set('language_type', 'CHN_ENG');
  body.set('detect_direction', 'true');
  body.set('paragraph', 'true');

  const response = await fetch(`${BAIDU_OCR_ENDPOINT}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(20000),
  });

  const payload = (await response.json()) as BaiduOcrResponse;
  if (!response.ok || payload.error_code) {
    const detail = payload.error_msg || `百度 OCR 调用失败（HTTP ${response.status}）`;
    throw new Error(detail);
  }

  const text = (payload.words_result || [])
    .map((item) => item.words?.trim())
    .filter(Boolean)
    .join('\n');

  if (!text.trim()) {
    throw new Error('图片中未识别到可用文字');
  }

  return text;
}

function resolveDeepSeekUrl(): string {
  const rawBase = process.env.DEEPSEEK_BASE_URL?.trim() || DEEPSEEK_DEFAULT_BASE;
  const base = rawBase.replace(/\/+$/, '');
  return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

async function refineWithLlm(rawText: string, fallback: StepData): Promise<StepData> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return fallback;

  const prompt = `你是白纸回忆法助手。请严格根据 OCR 文本抽取 5 步字段，不能编造。\n\n` +
    `仅输出 JSON，不要输出解释。字段：\n` +
    `${JSON.stringify(EMPTY_STEPS, null, 2)}\n\n` +
    `OCR 文本如下：\n${rawText}`;

  const response = await fetch(resolveDeepSeekUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.KNOWLEDGE_OCR_LLM_MODEL?.trim() || 'deepseek-v4-flash',
      temperature: 0.1,
      messages: [
        { role: 'system', content: '你是严谨的信息抽取助手，只能依据给定文本抽取字段。' },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) return fallback;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim() || '';
  if (!content) return fallback;

  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);
    const llmSteps = safeStepData(parsed);
    return mergeSteps(llmSteps, fallback);
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.BAIDU_OCR_API_KEY?.trim();
    const secretKey = process.env.BAIDU_OCR_SECRET_KEY?.trim();

    if (!apiKey || !secretKey) {
      return Response.json(
        {
          success: false,
          error: '后端未配置百度 OCR，请联系管理员配置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY。',
        },
        { status: 500 },
      );
    }

    let body: OcrRequestBody;
    try {
      body = (await request.json()) as OcrRequestBody;
    } catch {
      return Response.json({ success: false, error: '请求体不是合法 JSON。' }, { status: 400 });
    }

    if (!body?.image || typeof body.image !== 'string') {
      return Response.json({ success: false, error: '未收到图片数据。' }, { status: 400 });
    }

    const imageBase64 = sanitizeBase64(body.image);
    if (!imageBase64 || imageBase64.length < 40) {
      return Response.json({ success: false, error: '图片内容为空或格式不正确。' }, { status: 400 });
    }

    if (imageBase64.length > 14 * 1024 * 1024) {
      return Response.json({ success: false, error: '图片过大，请压缩后重试（建议 10MB 以内）。' }, { status: 400 });
    }

    const accessToken = await getBaiduAccessToken(apiKey, secretKey);
    const rawText = await runBaiduOcr(imageBase64, accessToken);

    let steps = buildHeuristicSteps(rawText);
    steps = await refineWithLlm(rawText, steps);

    const moderation = await checkCombinedCompliance({
      inputs: [rawText, JSON.stringify(steps)],
      scene: 'knowledge-ocr',
      service: process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() || undefined,
    });

    if (moderation.blocked) {
      return Response.json(
        {
          success: false,
          error: '输入内容未通过审核，请调整后重试。',
          detail: moderation.labels.length ? `命中标签：${moderation.labels.join(', ')}` : undefined,
        },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      data: steps,
      rawText: truncate(rawText, 1200),
      provider: 'baidu-ocr',
    });
  } catch (error) {
    console.error('knowledge OCR error:', error);
    return Response.json(
      {
        success: false,
        error: 'OCR 处理失败，请稍后重试。',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

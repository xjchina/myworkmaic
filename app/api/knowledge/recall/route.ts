import { NextRequest } from 'next/server';
import { apiError } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { consumeUsageWithTransaction } from '@/lib/server/subscription';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';
import { callLLM } from '@/lib/ai/llm';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';

type RecallSteps = {
  step1?: string;
  step2Mistake?: string;
  step2Focus?: string;
  step3?: string;
  step4Type?: string;
  step4Condition?: string;
  step4Goal?: string;
  step4Steps?: string;
  step5?: string;
};

type DialogueMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const SUBJECT_HINTS: Record<string, string> = {
  数学: '强调概念、公式、题型和解题步骤。',
  物理: '强调单位、方向、受力与过程分析。',
  化学: '强调方程式、条件、现象和推理链路。',
  英语: '强调语法结构、词组搭配和例句应用。',
  历史: '强调时间线、因果关系、事件意义。',
  地理: '强调区域特征、成因、分布与读图思路。',
  生物: '强调结构-功能-过程的对应关系。',
  政治: '强调主体、观点、逻辑和规范表达。',
};

function buildSystemPrompt(subject: string, chapter: string): string {
  const subjectHint = SUBJECT_HINTS[subject] ?? '强调核心概念、易错点与应用方法。';
  return [
    `你是${subject}学习教练，使用“白纸回忆法”帮助学生复盘。`,
    `当前章节：${chapter || '未填写章节'}`,
    '',
    '流程要求：',
    '1. 引导学生按 5 步完成回忆：核心概念 → 易错点与重点 → 公式/定理 → 典型例题 → 方法总结。',
    '2. 每次只聚焦当前一步，不要一次讲完五步。',
    '3. 鼓励式反馈，指出缺漏并给出补充提示。',
    '4. 禁止输出无关发散内容，保持与用户输入紧密相关。',
    '5. 仅使用简体中文。',
    '',
    `学科提示：${subjectHint}`,
    '',
    '最终总结格式（五步都完成后再输出）：',
    '- 今日核心知识点',
    '- 易错点清单',
    '- 方法模板',
    '- 明日复习建议',
  ].join('\n');
}

function extractStepNumber(text: string): number | null {
  if (!text) return null;
  const tagged = text.match(/\[(?:STEP|步骤)\s*:\s*([1-5])\]/i);
  if (tagged) return Number(tagged[1]);

  const numeric = text.match(/第\s*([1-5])\s*步/);
  if (numeric) return Number(numeric[1]);

  const cn = text.match(/第\s*([一二三四五])\s*步/);
  if (!cn) return null;
  const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 };
  return map[cn[1]] ?? null;
}

function stripStepTag(text: string): string {
  return text.replace(/^\s*\[(?:STEP|步骤)\s*:\s*[1-5]\]\s*/i, '').replace(/^\s*\[SUMMARY\]\s*/i, '').trim();
}

function looksLikeFinalSummary(text: string): boolean {
  if (!text) return false;
  const hasKeywords = /(总结|复盘|核心知识点|易错点|方法模板)/.test(text);
  return hasKeywords && text.length > 120;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return apiError('INVALID_REQUEST', 401, '请先登录后再使用知识宇宙。');
    }

    const body = (await request.json()) as {
      chapter?: string;
      subject?: string;
      steps?: RecallSteps;
      currentStep?: number;
      sessionKey?: string;
      dialogueHistory?: DialogueMessage[];
    };

    // 关键约束：知识宇宙只使用用户在前端传入的模型配置，不使用服务端兜底。
    const { model, thinkingConfig } = await resolveModelFromRequest(request, body, {
      allowServerFallback: false,
    });

    const chapter = asString(body.chapter).trim();
    const subject = asString(body.subject).trim() || '数学';
    const steps = body.steps ?? {};
    const dialogueHistory = Array.isArray(body.dialogueHistory) ? body.dialogueHistory : null;
    const currentStepRaw = Number.isFinite(body.currentStep) ? Number(body.currentStep) : 1;
    const currentStep = Math.min(5, Math.max(1, Math.floor(currentStepRaw)));

    const lastUserText =
      dialogueHistory
        ?.filter((item) => item?.role === 'user')
        .slice(-1)
        .map((item) => asString(item.content))
        .join('\n') ?? '';

    const moderation = await checkCombinedCompliance({
      inputs: [
        chapter,
        subject,
        lastUserText,
        steps.step1,
        steps.step2Mistake,
        steps.step2Focus,
        steps.step3,
        steps.step4Type,
        steps.step4Condition,
        steps.step4Goal,
        steps.step4Steps,
        steps.step5,
      ],
      scene: 'knowledge-recall',
      userId,
      service: process.env.ALIYUN_GREEN_AI_TEXT_SERVICE?.trim() || undefined,
    });

    if (moderation.blocked) {
      return apiError(
        'CONTENT_SENSITIVE',
        400,
        '输入内容未通过审核，请调整后重试。',
        moderation.labels.length ? `命中标签：${moderation.labels.join(', ')}` : undefined,
      );
    }

    const isDialogMode = Array.isArray(dialogueHistory);
    const isDialogStart = isDialogMode && dialogueHistory.length === 0;
    const isFormSubmit = !isDialogMode && !!body.steps;

    if (isDialogStart || isFormSubmit) {
      const consumeResult = await consumeUsageWithTransaction(userId, 'knowledge', {
        dedupeKey:
          typeof body.sessionKey === 'string' && body.sessionKey.trim()
            ? `knowledge:${body.sessionKey.trim()}`
            : undefined,
        subject: `${subject}:${chapter || '未命名主题'}`,
      });
      if (!consumeResult.canUse) {
        return apiError(
          'INVALID_REQUEST',
          429,
          consumeResult.upgradeTip ?? '今日知识梳理额度已用完，请升级会员后继续使用。',
        );
      }
    }

    const systemPrompt = buildSystemPrompt(subject, chapter);

    if (isDialogMode) {
      const stepPrompt = [
        `你当前执行白纸回忆法第 ${currentStep} 步。`,
        '输出规则：',
        '1. 每次回答开头必须带标签：[STEP:1] 到 [STEP:5]。',
        '2. 当前信息不足时继续追问并保持同一步标签。',
        '3. 只有确认当前步完成，才进入下一步标签。',
        '4. 五步完成后，使用 [SUMMARY] 开头输出最终总结。',
      ].join('\n');

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'system' as const, content: stepPrompt },
        ...dialogueHistory,
      ];

      const result = await callLLM(
        { model, messages },
        'knowledge-recall-dialog',
        undefined,
        thinkingConfig,
      );

      const raw = asString(result.text);
      const clean = stripStepTag(raw);
      const step = extractStepNumber(raw) ?? extractStepNumber(clean);
      const isFinal = /^\s*\[SUMMARY\]/i.test(raw) || looksLikeFinalSummary(clean);
      return Response.json({ content: clean, step, isFinal });
    }

    const stepLines = [
      `第1步-核心概念：${steps.step1?.trim() || '（未填写）'}`,
      `第2步-易错点：${steps.step2Mistake?.trim() || '（未填写）'}；重点：${steps.step2Focus?.trim() || '（未填写）'}`,
      `第3步-公式/定理：${steps.step3?.trim() || '（未填写）'}`,
      `第4步-典型例题：题型=${steps.step4Type?.trim() || '（未填写）'}；条件=${steps.step4Condition?.trim() || '（未填写）'}；目标=${steps.step4Goal?.trim() || '（未填写）'}；关键步骤=${steps.step4Steps?.trim() || '（未填写）'}`,
      `第5步-方法总结：${steps.step5?.trim() || '（未填写）'}`,
    ].join('\n');

    const prompt = [
      `学科：${subject}`,
      `章节：${chapter || '未填写章节'}`,
      '',
      '以下是我的白纸回忆内容，请先评价每一步完整度，再输出最终总结：',
      stepLines,
    ].join('\n');

    const result = await callLLM(
      {
        model,
        system: systemPrompt,
        prompt,
      },
      'knowledge-recall-form',
      undefined,
      thinkingConfig,
    );

    return Response.json({ content: asString(result.text) || '（无响应）' });
  } catch (err) {
    console.error('Knowledge recall error:', err);
    const message = err instanceof Error ? err.message : '';

    if (
      /API key required for provider/i.test(message) ||
      /Unknown provider/i.test(message) ||
      /Unsupported provider type/i.test(message)
    ) {
      return apiError(
        'INVALID_REQUEST',
        400,
        '请先在教案课堂内置 OpenMAIC 的模型设置中配置语言模型和 API Key，再使用知识宇宙。',
      );
    }

    return apiError('INTERNAL_ERROR', 500, '服务器内部错误，请稍后重试。');
  }
}


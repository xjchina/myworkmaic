import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireOpsAdmin } from '@/lib/server/ops-auth';
import {
  createKnowledgePromptDraft,
  listKnowledgePromptVersions,
  type PromptMode,
  type PromptStepKey,
} from '@/lib/server/ops-knowledge-prompts';
import { isMissingTableError, missingTableHint } from '@/lib/server/ops-db-error';

export async function GET(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  try {
    const url = new URL(request.url);
    const subject = (url.searchParams.get('subject') || '').trim();
    const gradeSegment = (url.searchParams.get('gradeSegment') || '').trim();
    const mode = (url.searchParams.get('mode') || '').trim() as PromptMode | '';
    const stepKey = (url.searchParams.get('stepKey') || '').trim() as PromptStepKey | '';

    const items = await listKnowledgePromptVersions({
      subject: subject || undefined,
      gradeSegment: gradeSegment || undefined,
      mode: mode || undefined,
      stepKey: stepKey || undefined,
    });

    return apiSuccess({ items });
  } catch (error) {
    if (isMissingTableError(error)) {
      return apiSuccess({ items: [], warning: missingTableHint() });
    }
    const detail = error instanceof Error ? error.message : String(error || '');
    return apiError('INTERNAL_ERROR', 500, '读取提示词失败', detail || undefined);
  }
}

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  try {
    let body: {
      subject?: string;
      gradeSegment?: string;
      mode?: PromptMode;
      stepKey?: PromptStepKey;
      name?: string;
      systemPrompt?: string;
      teachingStyle?: string;
      outputFormat?: string;
      safetyConstraints?: string;
      antiDivergenceRules?: string;
      variables?: string[];
    };
    try {
      body = await request.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, '请求格式错误');
    }

    if (!body.subject || !body.gradeSegment || !body.mode) {
      return apiError('MISSING_REQUIRED_FIELD', 400, '请填写学科、年级段、模式');
    }

    const created = await createKnowledgePromptDraft(
      {
        subject: body.subject,
        gradeSegment: body.gradeSegment,
        mode: body.mode,
        stepKey: body.stepKey || 'global',
      },
      {
        name: body.name,
        systemPrompt: body.systemPrompt,
        teachingStyle: body.teachingStyle,
        outputFormat: body.outputFormat,
        safetyConstraints: body.safetyConstraints,
        antiDivergenceRules: body.antiDivergenceRules,
        variables: body.variables,
      },
      auth.session.username,
    );

    return apiSuccess({ item: created }, 201);
  } catch (error) {
    if (isMissingTableError(error)) {
      return apiError('INVALID_REQUEST', 400, missingTableHint());
    }
    const detail = error instanceof Error ? error.message : String(error || '');
    return apiError('INTERNAL_ERROR', 500, '创建提示词失败', detail || undefined);
  }
}

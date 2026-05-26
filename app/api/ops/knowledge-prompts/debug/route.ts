import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireOpsAdmin } from '@/lib/server/ops-auth';
import {
  getDefaultKnowledgePromptSections,
  renderKnowledgePromptTemplate,
} from '@/lib/server/ops-knowledge-prompts';

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  let body: {
    systemPrompt?: string;
    teachingStyle?: string;
    outputFormat?: string;
    safetyConstraints?: string;
    antiDivergenceRules?: string;
    variables?: Record<string, string>;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  const defaults = getDefaultKnowledgePromptSections();
  const rendered = renderKnowledgePromptTemplate(
    {
      systemPrompt: body.systemPrompt || defaults.systemPrompt,
      teachingStyle: body.teachingStyle || defaults.teachingStyle,
      outputFormat: body.outputFormat || defaults.outputFormat,
      safetyConstraints: body.safetyConstraints || defaults.safetyConstraints,
      antiDivergenceRules: body.antiDivergenceRules || defaults.antiDivergenceRules,
    },
    {
      subject: body.variables?.subject || '数学',
      chapter: body.variables?.chapter || '函数',
      student_level: body.variables?.student_level || '高中',
      mode: body.variables?.mode || 'dialog',
    },
  );

  return apiSuccess({ rendered });
}

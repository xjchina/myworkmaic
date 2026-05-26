import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireOpsAdmin } from '@/lib/server/ops-auth';
import {
  deleteKnowledgePromptVersion,
  getKnowledgePromptVersionById,
  updateKnowledgePromptDraft,
} from '@/lib/server/ops-knowledge-prompts';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  const item = await getKnowledgePromptVersionById(id);
  if (!item) return apiError('INVALID_REQUEST', 404, '版本不存在');
  return apiSuccess({ item });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  let body: {
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

  try {
    const updated = await updateKnowledgePromptDraft(id, body, auth.session.username);
    if (!updated) return apiError('INVALID_REQUEST', 404, '版本不存在');
    return apiSuccess({ item: updated });
  } catch (error) {
    return apiError('INVALID_REQUEST', 400, error instanceof Error ? error.message : '更新失败');
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  const deleted = await deleteKnowledgePromptVersion(id);
  if (!deleted) return apiError('INVALID_REQUEST', 404, '版本不存在');
  return apiSuccess({ item: deleted });
}

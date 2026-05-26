import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireOpsAdmin } from '@/lib/server/ops-auth';
import { rollbackKnowledgePromptVersion } from '@/lib/server/ops-knowledge-prompts';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  const item = await rollbackKnowledgePromptVersion(id, auth.session.username);
  if (!item) return apiError('INVALID_REQUEST', 404, '版本不存在');

  return apiSuccess({ message: '已回滚并发布', item });
}

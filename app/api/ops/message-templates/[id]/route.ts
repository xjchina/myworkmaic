import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { opsMessageTemplates } from '@/lib/db/schema';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  let body: {
    name?: string;
    category?: string;
    titleTemplate?: string;
    contentTemplate?: string;
    actionUrl?: string | null;
    variables?: string[];
    isEnabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  await db
    .update(opsMessageTemplates)
    .set({
      name: body.name,
      category: body.category,
      titleTemplate: body.titleTemplate,
      contentTemplate: body.contentTemplate,
      actionUrl: body.actionUrl ?? undefined,
      variablesJson: body.variables ? JSON.stringify(body.variables) : undefined,
      isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : undefined,
      updatedBy: auth.session.username,
      updatedAt: new Date(),
    })
    .where(eq(opsMessageTemplates.id, id));

  return apiSuccess({ message: '更新成功' });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  await db.delete(opsMessageTemplates).where(eq(opsMessageTemplates.id, id));
  return apiSuccess({ message: '删除成功' });
}

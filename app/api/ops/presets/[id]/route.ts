import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { opsPresetContents } from '@/lib/db/schema';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  let body: {
    contentType?: string;
    title?: string;
    summary?: string | null;
    payload?: unknown;
    sortOrder?: number;
    isVisible?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  await db
    .update(opsPresetContents)
    .set({
      contentType: body.contentType,
      title: body.title,
      summary: body.summary === undefined ? undefined : body.summary,
      payloadJson: typeof body.payload === 'undefined' ? undefined : JSON.stringify(body.payload),
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : undefined,
      isVisible: typeof body.isVisible === 'boolean' ? body.isVisible : undefined,
      updatedBy: auth.session.username,
      updatedAt: new Date(),
    })
    .where(eq(opsPresetContents.id, id));

  return apiSuccess({ message: '更新成功' });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  await db.delete(opsPresetContents).where(eq(opsPresetContents.id, id));
  return apiSuccess({ message: '删除成功' });
}

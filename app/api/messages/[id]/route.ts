import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { deleteMessage } from '@/lib/server/messages';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const { id } = await context.params;
  const messageId = (id || '').trim();
  if (!messageId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '消息 id 不能为空。');
  }

  const ok = await deleteMessage(userId, messageId);
  if (!ok) {
    return apiError('INVALID_REQUEST', 404, '消息不存在或无权限。');
  }

  return apiSuccess({ message: '已删除' });
}

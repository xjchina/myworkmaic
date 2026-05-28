import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { markAllMessagesRead } from '@/lib/server/messages';

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const affected = await markAllMessagesRead(userId);
  return apiSuccess({ message: '操作成功', affected });
}

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { getUnreadMessageCount } from '@/lib/server/messages';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const unreadCount = await getUnreadMessageCount(userId);
  return apiSuccess({ unreadCount });
}

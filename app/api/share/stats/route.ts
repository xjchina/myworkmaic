import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { getShareStats } from '@/lib/server/subscription';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const stats = await getShareStats(userId);
  if (!stats) {
    return apiError('INVALID_REQUEST', 404, '用户不存在');
  }

  return apiSuccess({ data: stats });
}

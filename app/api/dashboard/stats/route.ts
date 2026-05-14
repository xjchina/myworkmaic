import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { getDashboardStats } from '@/lib/server/dashboard-stats';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  try {
    const stats = await getDashboardStats(userId);
    return apiSuccess({ data: stats });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      '读取首页统计失败',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}


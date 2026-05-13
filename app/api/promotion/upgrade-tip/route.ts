import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { getUpgradeTip } from '@/lib/server/subscription';

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const feature = request.nextUrl.searchParams.get('feature') ?? 'classroom';

  const tip = await getUpgradeTip(userId, feature);
  if (!tip) {
    return apiError('INVALID_REQUEST', 404, '用户不存在');
  }

  return apiSuccess({ data: tip });
}

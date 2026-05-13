import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { checkUsage } from '@/lib/server/subscription';

const VALID_FEATURES = ['classroom', 'exercise', 'knowledge'];

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const feature = request.nextUrl.searchParams.get('feature') ?? '';
  if (!VALID_FEATURES.includes(feature)) {
    return apiError('INVALID_REQUEST', 400, `feature 参数无效，可选：${VALID_FEATURES.join(', ')}`);
  }

  const result = await checkUsage(userId, feature);

  if (!result.canUse) {
    return apiSuccess({ data: result }, 200);
  }

  return apiSuccess({ data: result });
}

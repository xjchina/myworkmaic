import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { claimInviteRewards } from '@/lib/server/subscription';

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const result = await claimInviteRewards(userId);

  return apiSuccess({
    data: result,
    message: result.claimedCount > 0 ? `已领取 ${result.rewardDays} 天会员奖励` : '暂无可领取奖励',
  });
}

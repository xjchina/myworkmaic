import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { ensureInviteCode } from '@/lib/server/subscription';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zhiyi.app';

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const inviteCode = await ensureInviteCode(userId);
  const inviteUrl = `${BASE_URL}/invite/${inviteCode}`;

  return apiSuccess({
    data: {
      inviteCode,
      inviteUrl,
      rewardDescription: '每成功邀请1位好友开通会员，双方各获得30天会员权益',
    },
  });
}

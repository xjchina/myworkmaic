import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { ensureInviteCode } from '@/lib/server/subscription';

function resolveBaseUrl(request: Request): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBaseUrl) return envBaseUrl.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const inviteCode = await ensureInviteCode(userId);
  const baseUrl = resolveBaseUrl(request);
  const inviteUrl = `${baseUrl}/invite/${inviteCode}`;

  return apiSuccess({
    data: {
      // keep both keys for backward/forward compatibility
      link: inviteUrl,
      inviteCode,
      inviteUrl,
      rewardDescription: '每成功邀请1位好友开通会员，双方各获得30天会员权益',
    },
  });
}

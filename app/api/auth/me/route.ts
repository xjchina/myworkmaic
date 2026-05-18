import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId, findUserById } from '@/lib/server/auth';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return apiError('INVALID_REQUEST', 401, '未登录');
    }

    const user = await findUserById(userId);
    if (!user) {
      return apiError('INVALID_REQUEST', 401, '用户不存在或登录已失效');
    }

    return apiSuccess({
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        avatar: user.avatar,
        subscriptionType: user.subscriptionType,
        subscriptionExpiresAt: user.subscriptionExpiresAt
          ? user.subscriptionExpiresAt.toISOString().slice(0, 10)
          : null,
        createdAt: user.createdAt.getTime(),
        lastLoginAt: user.lastLoginAt.getTime(),
      },
    });
  } catch (error) {
    console.error('[auth/me] 查询当前用户失败:', error);
    return apiError('INTERNAL_ERROR', 503, '认证服务暂不可用，请稍后重试');
  }
}

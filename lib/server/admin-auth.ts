import { getAuthUserId, findUserById } from '@/lib/server/auth';
import { isAdminIdentity } from '@/lib/server/admin';

export async function requireAdminUser() {
  const userId = await getAuthUserId();
  if (!userId) {
    return { ok: false as const, status: 401, error: '请先登录' };
  }

  const user = await findUserById(userId);
  if (!user) {
    return { ok: false as const, status: 401, error: '登录已失效，请重新登录' };
  }

  if (!isAdminIdentity({ userId: user.id, phone: user.phone })) {
    return { ok: false as const, status: 403, error: '无管理员权限' };
  }

  return { ok: true as const, user };
}

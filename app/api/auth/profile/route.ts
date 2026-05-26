import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getAuthUserId } from '@/lib/server/auth';

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  let body: { displayName?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  const nextDisplayName = (body.displayName || '').trim();
  if (!nextDisplayName) {
    return apiError('INVALID_REQUEST', 400, '昵称不能为空');
  }
  if (nextDisplayName.length > 50) {
    return apiError('INVALID_REQUEST', 400, '昵称最多 50 个字符');
  }

  await db.update(users).set({ displayName: nextDisplayName }).where(eq(users.id, userId));
  return apiSuccess({ message: '昵称已更新', displayName: nextDisplayName });
}


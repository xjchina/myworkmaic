import { apiSuccess } from '@/lib/server/api-response';
import { clearAuthCookie } from '@/lib/server/auth';

export async function POST() {
  await clearAuthCookie();
  return apiSuccess({ message: '已退出登录' });
}

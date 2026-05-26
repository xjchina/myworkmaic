import { apiSuccess } from '@/lib/server/api-response';
import { buildOpsLogoutCookie } from '@/lib/server/ops-auth';

export async function POST() {
  const res = apiSuccess({ message: '已退出' });
  res.cookies.set(buildOpsLogoutCookie());
  return res;
}

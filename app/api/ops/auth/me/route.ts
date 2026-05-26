import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getOpsAdminSession } from '@/lib/server/ops-auth';

export async function GET() {
  const session = await getOpsAdminSession();
  if (!session) {
    return apiError('INVALID_REQUEST', 401, '未登录后台');
  }
  return apiSuccess({
    user: {
      username: session.username,
      displayName: session.displayName,
      expiresAt: session.exp,
    },
  });
}

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId, findUserById } from '@/lib/server/auth';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, 'Not authenticated');
  }

  const user = await findUserById(userId);
  if (!user) {
    return apiError('INVALID_REQUEST', 401, 'User not found');
  }

  return apiSuccess({
    user: {
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      avatar: user.avatar,
      createdAt: user.createdAt.getTime(),
      lastLoginAt: user.lastLoginAt.getTime(),
    },
  });
}

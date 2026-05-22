import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { markAllMessagesRead, type MessageCategory } from '@/lib/server/messages';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  let body: { category?: MessageCategory | 'all' };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const affected = await markAllMessagesRead(userId, body.category || 'all');
  return apiSuccess({ message: '操作成功', affected });
}

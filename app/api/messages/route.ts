import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { listUserMessages, type MessageCategory } from '@/lib/server/messages';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '20');
  const category = (searchParams.get('category') || 'all') as MessageCategory | 'all';
  const box = (searchParams.get('box') || 'all') as 'all' | 'announcement' | 'personal';
  const unreadOnly = searchParams.get('unreadOnly') === '1';

  const data = await listUserMessages({
    userId,
    page,
    pageSize,
    category,
    box,
    unreadOnly,
  });

  return apiSuccess({ data });
}

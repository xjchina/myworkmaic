import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { markMessageRead } from '@/lib/server/messages';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确。');
  }

  const id = (body.id || '').trim();
  if (!id) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '消息 id 不能为空。');
  }

  const ok = await markMessageRead(userId, id);
  if (!ok) {
    return apiError('INVALID_REQUEST', 404, '消息不存在或无权限。');
  }

  return apiSuccess({ message: '已标记为已读' });
}

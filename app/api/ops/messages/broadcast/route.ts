import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createBroadcastAnnouncement } from '@/lib/server/messages';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  let body: { title?: string; content?: string; actionUrl?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  if (!title || !content) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '标题和内容不能为空');
  }

  const count = await createBroadcastAnnouncement({
    title,
    content,
    actionUrl: (body.actionUrl || '').trim() || '/messages',
    meta: { source: 'ops-admin', sender: auth.session.username },
  });

  return apiSuccess({ message: `已发送给 ${count} 位用户`, count });
}

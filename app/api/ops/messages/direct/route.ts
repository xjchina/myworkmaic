import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { createUserMessage } from '@/lib/server/messages';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  let body: {
    userId?: string;
    phone?: string;
    category?: 'system' | 'learning' | 'security' | 'membership' | 'activity';
    title?: string;
    content?: string;
    actionUrl?: string;
  };
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

  let targetUserId = (body.userId || '').trim();
  if (!targetUserId && body.phone) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, body.phone.trim()))
      .limit(1);
    targetUserId = rows[0]?.id || '';
  }
  if (!targetUserId) {
    return apiError('INVALID_REQUEST', 404, '找不到目标用户');
  }

  await createUserMessage({
    userId: targetUserId,
    category: body.category || 'system',
    title,
    content,
    actionUrl: (body.actionUrl || '').trim() || '/messages',
    meta: { source: 'ops-admin', sender: auth.session.username },
  });

  return apiSuccess({ message: '发送成功' });
}

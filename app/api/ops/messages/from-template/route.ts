import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { opsMessageTemplates, users } from '@/lib/db/schema';
import { createBroadcastAnnouncement, createUserMessage } from '@/lib/server/messages';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

function fillTemplate(text: string, variables: Record<string, string>) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] || '');
}

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  let body: {
    templateId?: string;
    variables?: Record<string, string>;
    target?: 'broadcast' | 'direct';
    userId?: string;
    phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  const templateId = (body.templateId || '').trim();
  if (!templateId) return apiError('MISSING_REQUIRED_FIELD', 400, '请先选择模板');

  const rows = await db
    .select()
    .from(opsMessageTemplates)
    .where(eq(opsMessageTemplates.id, templateId))
    .limit(1);
  const template = rows[0];
  if (!template || !template.isEnabled) {
    return apiError('INVALID_REQUEST', 404, '模板不存在或已停用');
  }

  const vars = body.variables || {};
  const title = fillTemplate(template.titleTemplate, vars);
  const content = fillTemplate(template.contentTemplate, vars);
  const actionUrl = template.actionUrl || '/messages';
  const target = body.target || 'broadcast';

  if (target === 'broadcast') {
    const count = await createBroadcastAnnouncement({
      title,
      content,
      actionUrl,
      meta: { source: 'ops-template', templateId, sender: auth.session.username },
    });
    return apiSuccess({ message: `已发送给 ${count} 位用户`, count });
  }

  let targetUserId = (body.userId || '').trim();
  if (!targetUserId && body.phone) {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, body.phone.trim()))
      .limit(1);
    targetUserId = userRows[0]?.id || '';
  }
  if (!targetUserId) {
    return apiError('INVALID_REQUEST', 404, '找不到目标用户');
  }

  await createUserMessage({
    userId: targetUserId,
    category: template.category as 'system' | 'learning' | 'security' | 'membership' | 'activity',
    title,
    content,
    actionUrl,
    meta: { source: 'ops-template', templateId, sender: auth.session.username },
  });
  return apiSuccess({ message: '发送成功' });
}

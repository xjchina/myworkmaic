import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdminUser } from '@/lib/server/admin-auth';
import { createUserMessage } from '@/lib/server/messages';
import { findUserByPhone, normalizePhone } from '@/lib/server/auth';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin.ok) {
    return apiError('INVALID_REQUEST', admin.status, admin.error);
  }

  let body: {
    userId?: string;
    phone?: string;
    category?: 'system' | 'learning' | 'security' | 'membership';
    title?: string;
    content?: string;
    actionUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确。');
  }

  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  const actionUrl = (body.actionUrl || '').trim();
  const category = body.category || 'system';
  const validCategories = new Set(['system', 'learning', 'security', 'membership']);
  if (!validCategories.has(category)) {
    return apiError('INVALID_REQUEST', 400, '消息分类不合法。');
  }

  if (!title || !content) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '消息标题和内容不能为空。');
  }

  const moderation = await checkCombinedCompliance({
    inputs: [title, content, actionUrl, body.userId, body.phone],
    scene: 'admin-message-direct',
    service: process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() || undefined,
  });

  if (moderation.blocked) {
    return apiError(
      'CONTENT_SENSITIVE',
      400,
      '输入内容未通过审核，请调整后重试。',
      moderation.labels.length ? `命中标签：${moderation.labels.join(', ')}` : undefined,
    );
  }

  let targetUserId = (body.userId || '').trim();

  if (!targetUserId) {
    const normalizedPhone = normalizePhone(body.phone || '');
    if (!normalizedPhone) {
      return apiError('MISSING_REQUIRED_FIELD', 400, '请填写用户ID或手机号。');
    }
    const user = await findUserByPhone(normalizedPhone);
    if (!user) {
      return apiError('INVALID_REQUEST', 404, '未找到该手机号对应用户。');
    }
    targetUserId = user.id;
  }

  await createUserMessage({
    userId: targetUserId,
    category,
    title,
    content,
    actionUrl: actionUrl || '/messages',
    meta: {
      source: 'admin',
      senderId: admin.user.id,
      senderName: admin.user.displayName,
    },
  });

  return apiSuccess({ message: '消息已发送' });
}

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdminUser } from '@/lib/server/admin-auth';
import { createBroadcastAnnouncement } from '@/lib/server/messages';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin.ok) {
    return apiError('INVALID_REQUEST', admin.status, admin.error);
  }

  let body: { title?: string; content?: string; actionUrl?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确。');
  }

  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  const actionUrl = (body.actionUrl || '').trim();

  if (!title || !content) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '公告标题和内容不能为空。');
  }

  const moderation = await checkCombinedCompliance({
    inputs: [title, content, actionUrl],
    scene: 'admin-message-broadcast',
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

  const count = await createBroadcastAnnouncement({
    title,
    content,
    actionUrl: actionUrl || '/messages',
    meta: {
      source: 'admin',
      senderId: admin.user.id,
      senderName: admin.user.displayName,
    },
  });

  return apiSuccess({ message: `已群发公告给 ${count} 位用户`, count });
}

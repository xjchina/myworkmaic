import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';
import { logUsage } from '@/lib/server/subscription';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  let body: {
    feature?: string;
    action?: string;
    subject?: string;
    duration_seconds?: number;
  };

  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确。');
  }

  if (!body.feature) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'feature 字段必填');
  }

  const moderation = await checkCombinedCompliance({
    inputs: [body.feature, body.action, body.subject],
    scene: 'usage-log',
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

  await logUsage(userId, {
    feature: body.feature,
    action: body.action,
    subject: body.subject,
    durationSeconds: body.duration_seconds,
  });

  return apiSuccess({ message: '记录成功' });
}

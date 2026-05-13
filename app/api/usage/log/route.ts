import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
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
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  if (!body.feature) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'feature 字段必填');
  }

  await logUsage(userId, {
    feature: body.feature,
    action: body.action,
    subject: body.subject,
    durationSeconds: body.duration_seconds,
  });

  return apiSuccess({ message: '记录成功' });
}

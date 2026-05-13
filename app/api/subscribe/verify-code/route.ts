import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { redeemCode } from '@/lib/server/subscription';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const code = (body.code ?? '').trim();
  if (!code) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '请输入订阅码');
  }

  // Validate format: XXXX-XXXX-XXXX-XXXX
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
    return apiError('INVALID_REQUEST', 400, '订阅码格式错误，格式为 XXXX-XXXX-XXXX-XXXX');
  }

  const result = await redeemCode(userId, code);

  if (!result.success) {
    return apiError('INVALID_REQUEST', 400, result.message);
  }

  return apiSuccess({
    message: result.message,
    data: {
      expiresAt: result.expiresAt,
      remainingDays: result.remainingDays,
    },
  });
}

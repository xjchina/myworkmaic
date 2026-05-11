import { apiError, apiSuccess } from '@/lib/server/api-response';
import { normalizePhone, isValidPhone, createOtpTicket } from '@/lib/server/auth';

export async function POST(request: Request) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const phone = normalizePhone(body.phone || '');
  if (!isValidPhone(phone)) {
    return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
  }

  const result = await createOtpTicket(phone);

  if (!result.success) {
    return apiError('INVALID_REQUEST', 429, result.message);
  }

  return apiSuccess({
    message: result.message,
    debugCode: result.debugCode,
  });
}

import { NextResponse } from 'next/server';
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
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INVALID_REQUEST',
        error: result.message,
        ...(typeof result.waitSeconds === 'number' ? { waitSeconds: result.waitSeconds } : {}),
      },
      { status: 429 },
    );
  }

  return apiSuccess({
    message: result.message,
    ...(process.env.NODE_ENV !== 'production' && result.debugCode
      ? { debugCode: result.debugCode }
      : {}),
  });
}

import { NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { normalizePhone, isValidPhone, createOtpTicket } from '@/lib/server/auth';
import { enforceAuthSecurity, recordAuthResult, verifyCaptcha } from '@/lib/server/auth-security';

type SendCodeBody = {
  phone?: string;
  captchaId?: string;
  captchaAnswer?: string;
};

export async function POST(request: Request) {
  let body: SendCodeBody;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确');
  }

  const phone = normalizePhone(body.phone || '');
  if (!isValidPhone(phone)) {
    return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
  }

  const security = await enforceAuthSecurity({ request, action: 'send_code', phone });
  if (!security.ok) {
    await recordAuthResult({ request, action: 'send_code', phone, success: false, reason: 'rate_or_ban' });
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INVALID_REQUEST',
        error: security.message,
        ...(typeof security.waitSeconds === 'number' ? { waitSeconds: security.waitSeconds } : {}),
      },
      { status: 429 },
    );
  }

  const captcha = await verifyCaptcha({
    request,
    captchaId: body.captchaId,
    captchaAnswer: body.captchaAnswer,
  });

  if (!captcha.ok) {
    await recordAuthResult({ request, action: 'send_code', phone, success: false, reason: 'captcha_failed' });
    return apiError('INVALID_REQUEST', 400, captcha.message || '图形验证码校验失败。');
  }

  const result = await createOtpTicket(phone);
  if (!result.success) {
    await recordAuthResult({ request, action: 'send_code', phone, success: false, reason: 'otp_send_failed' });
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

  await recordAuthResult({ request, action: 'send_code', phone, success: true });

  return apiSuccess({
    message: result.message,
    ...(process.env.NODE_ENV !== 'production' && result.debugCode
      ? { debugCode: result.debugCode }
      : {}),
  });
}

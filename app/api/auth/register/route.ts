import { randomUUID } from 'crypto';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  normalizePhone,
  isValidPhone,
  isValidPassword,
  verifyOtpCode,
  findUserByPhone,
  createUser,
  hashPassword,
  setAuthCookie,
  updateLastLoginAt,
  findUserByInviteCode,
} from '@/lib/server/auth';
import { enforceAuthSecurity, recordAuthResult, verifyCaptcha } from '@/lib/server/auth-security';

type RegisterBody = {
  phone?: string;
  code?: string;
  password?: string;
  displayName?: string;
  inviteCode?: string;
  captchaId?: string;
  captchaAnswer?: string;
};

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确');
  }

  const phone = normalizePhone(body.phone || '');
  const code = body.code || '';
  const password = body.password || '';
  const displayName = body.displayName?.trim() || '学员';
  const inviteCode = normalizeInviteCode(body.inviteCode || '');

  if (!isValidPhone(phone)) {
    await recordAuthResult({ request, action: 'register', success: false, reason: 'invalid_phone' });
    return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
  }

  const security = await enforceAuthSecurity({ request, action: 'register', phone });
  if (!security.ok) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'rate_or_ban' });
    return apiError('INVALID_REQUEST', 429, security.message || '注册受限，请稍后重试。');
  }

  const captcha = await verifyCaptcha({
    request,
    captchaId: body.captchaId,
    captchaAnswer: body.captchaAnswer,
  });
  if (!captcha.ok) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'captcha_failed' });
    return apiError('INVALID_REQUEST', 400, captcha.message || '图形验证码校验失败。');
  }

  if (!isValidPassword(password)) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'password_invalid' });
    return apiError('INVALID_REQUEST', 400, '密码至少 8 位，且需包含大小写字母和数字。');
  }

  const existing = await findUserByPhone(phone);
  if (existing) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'already_registered' });
    return apiError('INVALID_REQUEST', 409, '该手机号已注册，请直接登录。');
  }

  const otpResult = await verifyOtpCode(phone, code);
  if (!otpResult.success) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'otp_invalid' });
    return apiError('INVALID_REQUEST', 400, otpResult.message);
  }

  let invitedBy: string | null = null;
  if (inviteCode) {
    const inviter = await findUserByInviteCode(inviteCode);
    if (!inviter) {
      await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'invite_invalid' });
      return apiError('INVALID_REQUEST', 400, '邀请码无效，请检查后重试。');
    }
    invitedBy = inviter.id;
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await createUser({
    id: userId,
    phone,
    passwordHash,
    displayName,
    invitedBy,
  });

  await setAuthCookie(userId);
  await updateLastLoginAt(userId);
  await recordAuthResult({ request, action: 'register', phone, success: true });

  return apiSuccess({
    message: '注册成功',
    user: { id: userId, phone, displayName },
  });
}

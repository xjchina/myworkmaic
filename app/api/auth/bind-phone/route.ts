import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import {
  findUserById,
  findUserByPhone,
  getAuthUserId,
  hashPassword,
  isPhoneBound,
  isValidPassword,
  isValidPhone,
  normalizePhone,
  verifyOtpCode,
} from '@/lib/server/auth';
import { enforceAuthSecurity, recordAuthResult, verifyCaptcha } from '@/lib/server/auth-security';
import { createUserMessageSafe } from '@/lib/server/messages';
import { isAdminIdentity } from '@/lib/server/admin';

type BindPhoneBody = {
  phone?: string;
  code?: string;
  password?: string;
  captchaId?: string;
  captchaAnswer?: string;
};

export async function POST(request: Request) {
  let body: BindPhoneBody;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体格式错误，请检查后重试。');
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录。');
  }

  const currentUser = await findUserById(userId);
  if (!currentUser) {
    return apiError('INVALID_REQUEST', 401, '登录状态已失效，请重新登录。');
  }

  if (isPhoneBound(currentUser.phone) && !currentUser.wechatOpenId) {
    return apiError('INVALID_REQUEST', 400, '当前账号已绑定手机号。');
  }

  const phone = normalizePhone(body.phone || '');
  const code = (body.code || '').trim();
  const password = body.password || '';

  if (!isValidPhone(phone)) {
    await recordAuthResult({ request, action: 'register', success: false, reason: 'invalid_phone' });
    return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
  }

  const security = await enforceAuthSecurity({ request, action: 'register', phone });
  if (!security.ok) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'rate_or_ban' });
    return apiError('INVALID_REQUEST', 429, security.message || '绑定请求过于频繁，请稍后重试。');
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

  if (!code) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'otp_empty' });
    return apiError('INVALID_REQUEST', 400, '请输入验证码。');
  }

  const otpResult = await verifyOtpCode(phone, code);
  if (!otpResult.success) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'otp_invalid' });
    return apiError('INVALID_REQUEST', 400, otpResult.message);
  }

  const existed = await findUserByPhone(phone);
  if (existed && existed.id !== currentUser.id) {
    await recordAuthResult({ request, action: 'register', phone, success: false, reason: 'already_registered' });
    return apiError('INVALID_REQUEST', 409, '该手机号已被其他账号绑定。');
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({
      phone,
      passwordHash,
      lastLoginAt: new Date(),
    })
    .where(eq(users.id, currentUser.id));

  await recordAuthResult({ request, action: 'register', phone, success: true });
  await createUserMessageSafe({
    userId: currentUser.id,
    category: 'security',
    title: '手机号绑定成功',
    content: `账号已绑定手机号 ${phone.slice(0, 3)}****${phone.slice(7)}。`,
    actionUrl: '/account',
  });

  return apiSuccess({
    message: '手机号绑定成功',
    user: {
      id: currentUser.id,
      phone,
      phoneBound: true,
      displayName: currentUser.displayName,
      avatar: currentUser.avatar,
      isAdmin: isAdminIdentity({ userId: currentUser.id, phone }),
      createdAt: currentUser.createdAt.getTime(),
      lastLoginAt: Date.now(),
    },
  });
}

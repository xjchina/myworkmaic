import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  findUserByPhone,
  isPhoneBound,
  isValidPhone,
  normalizePhone,
  setAuthCookie,
  updateLastLoginAt,
  verifyOtpCode,
  verifyPassword,
} from '@/lib/server/auth';
import { createAuthToken } from '@/lib/server/auth-token';
import { enforceAuthSecurity, recordAuthResult, verifyCaptcha } from '@/lib/server/auth-security';
import { createUserMessageSafe } from '@/lib/server/messages';
import { isAdminIdentity } from '@/lib/server/admin';

type LoginBody = {
  phone?: string;
  code?: string;
  password?: string;
  method?: 'code' | 'password';
  captchaId?: string;
  captchaAnswer?: string;
};

function toTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return Date.now();
}

export async function POST(request: Request) {
  try {
    let body: LoginBody;
    try {
      body = await request.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确。');
    }

    const phone = normalizePhone(body.phone || '');
    const method = body.method || 'code';

    if (!isValidPhone(phone)) {
      await recordAuthResult({ request, action: 'login', success: false, reason: 'invalid_phone' });
      return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
    }

    const security = await enforceAuthSecurity({ request, action: 'login', phone });
    if (!security.ok) {
      await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'rate_or_ban' });
      return apiError('INVALID_REQUEST', 429, security.message || '登录受限，请稍后重试。');
    }

    const captcha = await verifyCaptcha({
      request,
      captchaId: body.captchaId,
      captchaAnswer: body.captchaAnswer,
    });
    if (!captcha.ok) {
      await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'captcha_failed' });
      return apiError('INVALID_REQUEST', 400, captcha.message || '图形验证码校验失败。');
    }

    const user = await findUserByPhone(phone);
    if (!user) {
      await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'user_not_found' });
      return apiError('INVALID_REQUEST', 404, '该手机号尚未注册，请先注册。');
    }

    if (!isPhoneBound(user.phone)) {
      await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'phone_not_bound' });
      return apiError('INVALID_REQUEST', 400, '该手机号尚未绑定，请先使用微信扫码登录后完成手机号绑定。');
    }

    if (method === 'password') {
      const password = body.password || '';
      if (!password) {
        await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'password_empty' });
        return apiError('INVALID_REQUEST', 400, '请输入密码。');
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'password_incorrect' });
        return apiError('INVALID_REQUEST', 401, '密码错误，请重试。');
      }
    } else {
      const code = body.code || '';
      if (!code) {
        await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'otp_empty' });
        return apiError('INVALID_REQUEST', 400, '请输入验证码。');
      }

      const otpResult = await verifyOtpCode(phone, code);
      if (!otpResult.success) {
        await recordAuthResult({ request, action: 'login', phone, success: false, reason: 'otp_invalid' });
        return apiError('INVALID_REQUEST', 401, otpResult.message);
      }
    }

    await setAuthCookie(user.id);
    await updateLastLoginAt(user.id);
    await recordAuthResult({ request, action: 'login', phone, success: true });
    await createUserMessageSafe({
      userId: user.id,
      category: 'security',
      title: '登录成功',
      content: `你的账号于 ${new Date().toLocaleString('zh-CN', { hour12: false })} 登录成功。`,
      actionUrl: '/account',
    });

    const token = createAuthToken(user.id);
    return apiSuccess({
      message: `欢迎回来，${user.displayName}。`,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        phoneBound: isPhoneBound(user.phone),
        displayName: user.displayName,
        avatar: user.avatar,
        isAdmin: isAdminIdentity({ userId: user.id, phone: user.phone }),
        createdAt: toTimestamp(user.createdAt),
        lastLoginAt: toTimestamp(user.lastLoginAt),
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login failed:', error);
    const detail = error instanceof Error ? error.message : String(error);
    const message = process.env.NODE_ENV === 'production'
      ? '登录服务异常，请稍后重试。'
      : `登录服务异常：${detail}`;
    return apiError('INTERNAL_ERROR', 500, message);
  }
}

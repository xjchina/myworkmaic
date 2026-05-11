import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  normalizePhone,
  isValidPhone,
  verifyOtpCode,
  findUserByPhone,
  verifyPassword,
  setAuthCookie,
  updateLastLoginAt,
} from '@/lib/server/auth';

export async function POST(request: Request) {
  let body: { phone?: string; code?: string; password?: string; method?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const phone = normalizePhone(body.phone || '');
  const method = body.method || 'code'; // 'code' or 'password'

  if (!isValidPhone(phone)) {
    return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
  }

  // Find user
  const user = await findUserByPhone(phone);
  if (!user) {
    return apiError('INVALID_REQUEST', 404, '该手机号尚未注册，请先完成首次注册。');
  }

  if (method === 'password') {
    // Password login
    const password = body.password || '';
    if (!password) {
      return apiError('INVALID_REQUEST', 400, '请输入密码。');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return apiError('INVALID_REQUEST', 401, '密码错误，请重试。');
    }
  } else {
    // OTP code login
    const code = body.code || '';
    if (!code) {
      return apiError('INVALID_REQUEST', 400, '请输入验证码。');
    }

    const otpResult = await verifyOtpCode(phone, code);
    if (!otpResult.success) {
      return apiError('INVALID_REQUEST', 401, otpResult.message);
    }
  }

  // Set auth cookie
  await setAuthCookie(user.id);
  await updateLastLoginAt(user.id);

  return apiSuccess({
    message: `欢迎回来，${user.displayName}。`,
    user: {
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      avatar: user.avatar,
      createdAt: user.createdAt.getTime(),
      lastLoginAt: user.lastLoginAt.getTime(),
    },
  });
}

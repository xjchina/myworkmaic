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
} from '@/lib/server/auth';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  let body: { phone?: string; code?: string; password?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const phone = normalizePhone(body.phone || '');
  const code = body.code || '';
  const password = body.password || '';
  const displayName = body.displayName?.trim() || '学员';

  if (!isValidPhone(phone)) {
    return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
  }

  if (!isValidPassword(password)) {
    return apiError('INVALID_REQUEST', 400, '密码至少 8 位，并包含大小写字母和数字。');
  }

  // Check if phone already registered
  const existing = await findUserByPhone(phone);
  if (existing) {
    return apiError('INVALID_REQUEST', 409, '该手机号已注册，请直接登录。');
  }

  // Verify OTP
  const otpResult = await verifyOtpCode(phone, code);
  if (!otpResult.success) {
    return apiError('INVALID_REQUEST', 400, otpResult.message);
  }

  // Create user
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await createUser({
    id: userId,
    phone,
    passwordHash,
    displayName,
  });

  // Set auth cookie (auto-login after registration)
  await setAuthCookie(userId);
  await updateLastLoginAt(userId);

  return apiSuccess({
    message: '注册成功',
    user: { id: userId, phone, displayName },
  });
}

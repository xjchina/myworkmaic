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

type RegisterBody = {
  phone?: string;
  code?: string;
  password?: string;
  displayName?: string;
  inviteCode?: string;
};

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const phone = normalizePhone(body.phone || '');
  const code = body.code || '';
  const password = body.password || '';
  const displayName = body.displayName?.trim() || '学员';
  const inviteCode = normalizeInviteCode(body.inviteCode || '');

  if (!isValidPhone(phone)) {
    return apiError('INVALID_REQUEST', 400, '请输入有效的 11 位手机号。');
  }

  if (!isValidPassword(password)) {
    return apiError('INVALID_REQUEST', 400, '密码至少 8 位，且需包含大小写字母和数字。');
  }

  const existing = await findUserByPhone(phone);
  if (existing) {
    return apiError('INVALID_REQUEST', 409, '该手机号已注册，请直接登录。');
  }

  const otpResult = await verifyOtpCode(phone, code);
  if (!otpResult.success) {
    return apiError('INVALID_REQUEST', 400, otpResult.message);
  }

  let invitedBy: string | null = null;
  if (inviteCode) {
    const inviter = await findUserByInviteCode(inviteCode);
    if (!inviter) {
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

  return apiSuccess({
    message: '注册成功',
    user: { id: userId, phone, displayName },
  });
}

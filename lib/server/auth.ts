import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { users, otpTickets } from '@/lib/db/schema';
import { createAuthToken, verifyAuthToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from './auth-token';
import { cookies } from 'next/headers';
import { isTencentSmsEnabled, sendTencentSmsCode } from './tencent-sms';

// ==================== Validation ====================

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

// ==================== Password ====================

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

// ==================== User queries ====================

export async function findUserByPhone(phone: string) {
  const rows = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findUserByInviteCode(inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();
  if (!code) return null;

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      inviteCode: users.inviteCode,
    })
    .from(users)
    .where(eq(users.inviteCode, code))
    .limit(1);

  return rows[0] ?? null;
}

export async function createUser(data: {
  id: string;
  phone: string;
  passwordHash: string;
  displayName?: string;
  invitedBy?: string | null;
}) {
  await db.insert(users).values({
    id: data.id,
    phone: data.phone,
    passwordHash: data.passwordHash,
    displayName: data.displayName || '学员',
    invitedBy: data.invitedBy ?? null,
  });
}

export async function updateLastLoginAt(userId: string) {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}

// ==================== OTP ====================

const OTP_EXPIRE_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/** Pre-set test account bypass code */
const PRESET_TEST_PHONE = '13800138000';
const PRESET_TEST_OTP = '123456';

export function randomOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOtpTicket(phone: string): Promise<{
  success: boolean;
  message: string;
  debugCode?: string;
  waitSeconds?: number;
}> {
  // Pre-set test account: return fixed code without cooldown
  if (phone === PRESET_TEST_PHONE) {
    return {
      success: true,
      message: `测试账号验证码：${PRESET_TEST_OTP}（固定）`,
      debugCode: PRESET_TEST_OTP,
    };
  }

  const now = new Date();

  // Check cooldown
  const existing = await db
    .select()
    .from(otpTickets)
    .where(eq(otpTickets.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    const lastSentAt = existing[0].lastSentAt.getTime();
    const elapsed = now.getTime() - lastSentAt;
    if (elapsed < OTP_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        message: `验证码发送过于频繁，请 ${waitSeconds} 秒后重试。`,
        waitSeconds,
      };
    }
  }

  const code = randomOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRE_MS);
  const smsEnabled = isTencentSmsEnabled();

  if (smsEnabled) {
    const smsResult = await sendTencentSmsCode({
      phone,
      code,
      validMinutes: Math.floor(OTP_EXPIRE_MS / 60000),
    });

    if (!smsResult.success) {
      return {
        success: false,
        message: `短信发送失败：${smsResult.message}`,
      };
    }
  }

  // Upsert OTP ticket only after SMS send succeeds
  await db
    .insert(otpTickets)
    .values({
      phone,
      code,
      expiresAt,
      lastSentAt: now,
      attempts: 0,
    })
    .onDuplicateKeyUpdate({
      set: {
        code,
        expiresAt,
        lastSentAt: now,
        attempts: 0,
      },
    });

  return {
    success: true,
    message: smsEnabled
      ? `验证码已发送到 ${phone.slice(0, 3)}****${phone.slice(7)}`
      : `验证码已发送到 ${phone.slice(0, 3)}****${phone.slice(7)}（开发调试模式）`,
    debugCode: smsEnabled ? undefined : code,
  };
}

export async function verifyOtpCode(
  phone: string,
  code: string,
): Promise<{ success: boolean; message: string }> {
  // Pre-set test account bypass
  if (phone === PRESET_TEST_PHONE && code.trim() === PRESET_TEST_OTP) {
    return { success: true, message: '' };
  }

  const tickets = await db
    .select()
    .from(otpTickets)
    .where(eq(otpTickets.phone, phone))
    .limit(1);

  if (tickets.length === 0) {
    return { success: false, message: '请先获取验证码。' };
  }

  const ticket = tickets[0];

  // Check attempts
  if (ticket.attempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, message: '验证码已失效，请重新获取。' };
  }

  // Check expiry
  if (new Date() > ticket.expiresAt) {
    return { success: false, message: '验证码已过期，请重新获取。' };
  }

  // Increment attempts
  await db
    .update(otpTickets)
    .set({ attempts: ticket.attempts + 1 })
    .where(eq(otpTickets.phone, phone));

  // Verify code
  if (ticket.code !== code.trim()) {
    return { success: false, message: '验证码错误，请重试。' };
  }

  // Delete used ticket
  await db.delete(otpTickets).where(eq(otpTickets.phone, phone));

  return { success: true, message: '' };
}

// ==================== Auth Cookie ====================

export async function setAuthCookie(userId: string) {
  const token = createAuthToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

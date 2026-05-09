import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const OTP_EXPIRE_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;

type OtpTicket = {
  code: string;
  expiresAt: number;
  lastSentAt: number;
};

export interface LocalAuthUser {
  id: string;
  phone: string;
  password: string;
  displayName: string;
  createdAt: number;
  lastLoginAt: number;
}

interface RegisterPayload {
  phone: string;
  code: string;
  password: string;
  displayName?: string;
}

interface LoginWithPasswordPayload {
  phone: string;
  password: string;
}

interface LoginWithCodePayload {
  phone: string;
  code: string;
}

interface SessionActionResult {
  success: boolean;
  message?: string;
}

interface SendCodeResult extends SessionActionResult {
  debugCode?: string;
  waitSeconds?: number;
}

interface SessionState {
  isLoggedIn: boolean;
  displayName: string;
  userPhone: string;
  users: LocalAuthUser[];
  otpTickets: Record<string, OtpTicket>;
  sendOtp: (phone: string) => SendCodeResult;
  isPhoneRegistered: (phone: string) => boolean;
  registerWithPhone: (payload: RegisterPayload) => SessionActionResult;
  loginWithPassword: (payload: LoginWithPasswordPayload) => SessionActionResult;
  loginWithCode: (payload: LoginWithCodePayload) => SessionActionResult;
  logout: () => void;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function verifyOtp(
  tickets: Record<string, OtpTicket>,
  phone: string,
  code: string,
): SessionActionResult {
  const ticket = tickets[phone];
  if (!ticket) return { success: false, message: '请先获取验证码。' };
  if (Date.now() > ticket.expiresAt) return { success: false, message: '验证码已过期，请重新获取。' };
  if (ticket.code !== code.trim()) return { success: false, message: '验证码错误，请重试。' };
  return { success: true };
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      displayName: '',
      userPhone: '',
      users: [],
      otpTickets: {},
      sendOtp: (phoneInput) => {
        const phone = normalizePhone(phoneInput);
        if (!isValidPhone(phone)) {
          return { success: false, message: '请输入有效的 11 位手机号。' };
        }

        const now = Date.now();
        const oldTicket = get().otpTickets[phone];
        if (oldTicket && now - oldTicket.lastSentAt < OTP_COOLDOWN_MS) {
          const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - (now - oldTicket.lastSentAt)) / 1000);
          return {
            success: false,
            message: `验证码发送过于频繁，请 ${waitSeconds} 秒后重试。`,
            waitSeconds,
          };
        }

        const code = randomCode();
        set((state) => ({
          otpTickets: {
            ...state.otpTickets,
            [phone]: {
              code,
              expiresAt: now + OTP_EXPIRE_MS,
              lastSentAt: now,
            },
          },
        }));

        return {
          success: true,
          message: `验证码已发送到 ${maskPhone(phone)}（演示环境）。`,
          debugCode: code,
        };
      },
      isPhoneRegistered: (phoneInput) => {
        const phone = normalizePhone(phoneInput);
        return get().users.some((u) => u.phone === phone);
      },
      registerWithPhone: (payload) => {
        const phone = normalizePhone(payload.phone);
        const password = payload.password;
        const displayName = payload.displayName?.trim() || '学员';
        const users = get().users;

        if (!isValidPhone(phone)) return { success: false, message: '请输入有效的 11 位手机号。' };
        if (users.some((u) => u.phone === phone)) {
          return { success: false, message: '该手机号已注册，请直接登录。' };
        }
        if (!isValidPassword(password)) {
          return { success: false, message: '密码至少 8 位，并包含大小写字母和数字。' };
        }

        const otpResult = verifyOtp(get().otpTickets, phone, payload.code);
        if (!otpResult.success) return otpResult;

        const now = Date.now();
        const user: LocalAuthUser = {
          id: `user_${now}`,
          phone,
          password,
          displayName,
          createdAt: now,
          lastLoginAt: now,
        };

        set((state) => {
          const nextTickets = { ...state.otpTickets };
          delete nextTickets[phone];
          return {
            users: [...state.users, user],
            otpTickets: nextTickets,
          };
        });

        return { success: true, message: '注册成功，请使用验证码或密码登录。' };
      },
      loginWithPassword: (payload) => {
        const phone = normalizePhone(payload.phone);
        const user = get().users.find((u) => u.phone === phone);
        if (!isValidPhone(phone)) return { success: false, message: '请输入有效的 11 位手机号。' };
        if (!user) return { success: false, message: '该手机号尚未注册，请先完成首次注册。' };
        if (user.password !== payload.password) return { success: false, message: '密码错误，请重试。' };

        const now = Date.now();
        set((state) => ({
          isLoggedIn: true,
          displayName: user.displayName || '学员',
          userPhone: user.phone,
          users: state.users.map((item) =>
            item.phone === user.phone ? { ...item, lastLoginAt: now } : item,
          ),
        }));
        return { success: true, message: `欢迎回来，${user.displayName || '学员'}。` };
      },
      loginWithCode: (payload) => {
        const phone = normalizePhone(payload.phone);
        const user = get().users.find((u) => u.phone === phone);
        if (!isValidPhone(phone)) return { success: false, message: '请输入有效的 11 位手机号。' };
        if (!user) return { success: false, message: '该手机号尚未注册，请先完成首次注册。' };

        const otpResult = verifyOtp(get().otpTickets, phone, payload.code);
        if (!otpResult.success) return otpResult;

        const now = Date.now();
        set((state) => {
          const nextTickets = { ...state.otpTickets };
          delete nextTickets[phone];
          return {
            isLoggedIn: true,
            displayName: user.displayName || '学员',
            userPhone: user.phone,
            otpTickets: nextTickets,
            users: state.users.map((item) =>
              item.phone === user.phone ? { ...item, lastLoginAt: now } : item,
            ),
          };
        });
        return { success: true, message: `欢迎回来，${user.displayName || '学员'}。` };
      },
      logout: () =>
        set({
          isLoggedIn: false,
          displayName: '',
          userPhone: '',
        }),
    }),
    {
      name: 'session-storage',
    },
  ),
);


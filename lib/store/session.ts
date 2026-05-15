import { create } from 'zustand';

// ==================== Types ====================

interface RegisterPayload {
  phone: string;
  code: string;
  password: string;
  displayName?: string;
  inviteCode?: string;
  captchaId?: string;
  captchaAnswer?: string;
}

interface LoginWithPasswordPayload {
  phone: string;
  password: string;
  captchaId?: string;
  captchaAnswer?: string;
}

interface LoginWithCodePayload {
  phone: string;
  code: string;
  captchaId?: string;
  captchaAnswer?: string;
}

interface SessionActionResult {
  success: boolean;
  message?: string;
  debugCode?: string;
  waitSeconds?: number;
}

interface SessionState {
  isLoggedIn: boolean;
  displayName: string;
  userPhone: string;
  userId: string;
  userCreatedAt: number;
  userLastLoginAt: number;
  subscriptionType: string;
  subscriptionExpiresAt: string | null;
  /** Initialize session from server cookie — call once on app load */
  refreshSession: () => Promise<void>;
  /** Send OTP code to phone */
  sendOtp: (payload: {
    phone: string;
    captchaId?: string;
    captchaAnswer?: string;
  }) => Promise<SessionActionResult>;
  /** Register with phone + code + password */
  registerWithPhone: (payload: RegisterPayload) => Promise<SessionActionResult>;
  /** Login with phone + password */
  loginWithPassword: (payload: LoginWithPasswordPayload) => Promise<SessionActionResult>;
  /** Login with phone + OTP code */
  loginWithCode: (payload: LoginWithCodePayload) => Promise<SessionActionResult>;
  /** Logout */
  logout: () => Promise<void>;
  /** Check if phone is registered (server-side) */
  isPhoneRegistered: (phone: string) => Promise<boolean>;
}

// ==================== Helper ====================

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-render';

  const key = 'openmaic_device_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, random);
  return random;
}

function buildAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-device-id': getOrCreateDeviceId(),
  };
}

// ==================== Store ====================

export const useSessionStore = create<SessionState>()((set, _get) => ({
  isLoggedIn: false,
  displayName: '',
  userPhone: '',
  userId: '',
  userCreatedAt: 0,
  userLastLoginAt: 0,
  subscriptionType: 'free',
  subscriptionExpiresAt: null,

  refreshSession: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        set({
          isLoggedIn: false,
          displayName: '',
          userPhone: '',
          userId: '',
          userCreatedAt: 0,
          userLastLoginAt: 0,
          subscriptionType: 'free',
          subscriptionExpiresAt: null,
        });
        return;
      }
      const data = await res.json();
      if (data.success && data.user) {
        set({
          isLoggedIn: true,
          displayName: data.user.displayName,
          userPhone: data.user.phone,
          userId: data.user.id,
          userCreatedAt: data.user.createdAt,
          userLastLoginAt: data.user.lastLoginAt,
          subscriptionType: data.user.subscriptionType || 'free',
          subscriptionExpiresAt: data.user.subscriptionExpiresAt ?? null,
        });
      } else {
        set({
          isLoggedIn: false,
          displayName: '',
          userPhone: '',
          userId: '',
          userCreatedAt: 0,
          userLastLoginAt: 0,
          subscriptionType: 'free',
          subscriptionExpiresAt: null,
        });
      }
    } catch {
      // Network error — keep current state (don't force logout on offline)
    }
  },

  sendOtp: async (payload) => {
    const phone = normalizePhone(payload.phone);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          phone,
          captchaId: payload.captchaId,
          captchaAnswer: payload.captchaAnswer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          message: data.message || '验证码已发送',
          debugCode: data.debugCode,
        };
      }
      return {
        success: false,
        message: data.error || '发送失败',
        waitSeconds: data.waitSeconds,
      };
    } catch {
      return { success: false, message: '网络错误，请重试' };
    }
  },

  registerWithPhone: async (payload) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          phone: normalizePhone(payload.phone),
          code: payload.code,
          password: payload.password,
          displayName: payload.displayName,
          inviteCode: payload.inviteCode,
          captchaId: payload.captchaId,
          captchaAnswer: payload.captchaAnswer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        set({
          isLoggedIn: true,
          displayName: data.user?.displayName || '学员',
          userPhone: data.user?.phone || '',
          userId: data.user?.id || '',
        });
        return { success: true, message: data.message || '注册成功' };
      }
      return { success: false, message: data.error || '注册失败' };
    } catch {
      return { success: false, message: '网络错误，请重试' };
    }
  },

  loginWithPassword: async (payload) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          phone: normalizePhone(payload.phone),
          password: payload.password,
          method: 'password',
          captchaId: payload.captchaId,
          captchaAnswer: payload.captchaAnswer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        set({
          isLoggedIn: true,
          displayName: data.user?.displayName || '学员',
          userPhone: data.user?.phone || '',
          userId: data.user?.id || '',
          userCreatedAt: data.user?.createdAt || 0,
          userLastLoginAt: data.user?.lastLoginAt || 0,
        });
        return { success: true, message: data.message || '登录成功' };
      }
      return { success: false, message: data.error || '登录失败' };
    } catch {
      return { success: false, message: '网络错误，请重试' };
    }
  },

  loginWithCode: async (payload) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          phone: normalizePhone(payload.phone),
          code: payload.code,
          method: 'code',
          captchaId: payload.captchaId,
          captchaAnswer: payload.captchaAnswer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        set({
          isLoggedIn: true,
          displayName: data.user?.displayName || '学员',
          userPhone: data.user?.phone || '',
          userId: data.user?.id || '',
          userCreatedAt: data.user?.createdAt || 0,
          userLastLoginAt: data.user?.lastLoginAt || 0,
        });
        return { success: true, message: data.message || '登录成功' };
      }
      return { success: false, message: data.error || '登录失败' };
    } catch {
      return { success: false, message: '网络错误，请重试' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue even if network fails
    }
    set({
      isLoggedIn: false,
      displayName: '',
      userPhone: '',
      userId: '',
      userCreatedAt: 0,
      userLastLoginAt: 0,
      subscriptionType: 'free',
      subscriptionExpiresAt: null,
    });
  },

  isPhoneRegistered: async (_phoneInput) => {
    // We'll check via a lightweight approach — attempt login with a dummy code
    // and see if we get "not registered" vs "wrong code"
    // For now, always return false (registration check happens server-side on submit)
    return false;
  },
}));

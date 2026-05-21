import { create } from 'zustand';

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

interface BindPhonePayload {
  phone: string;
  code: string;
  password: string;
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
  isPhoneBound: boolean;
  userId: string;
  userCreatedAt: number;
  userLastLoginAt: number;
  subscriptionType: string;
  subscriptionExpiresAt: string | null;
  refreshSession: () => Promise<void>;
  sendOtp: (payload: {
    phone: string;
    captchaId?: string;
    captchaAnswer?: string;
  }) => Promise<SessionActionResult>;
  registerWithPhone: (payload: RegisterPayload) => Promise<SessionActionResult>;
  loginWithPassword: (payload: LoginWithPasswordPayload) => Promise<SessionActionResult>;
  loginWithCode: (payload: LoginWithCodePayload) => Promise<SessionActionResult>;
  bindPhone: (payload: BindPhonePayload) => Promise<SessionActionResult>;
  logout: () => Promise<void>;
  isPhoneRegistered: (phone: string) => Promise<boolean>;
}

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

const emptySession = {
  isLoggedIn: false,
  displayName: '',
  userPhone: '',
  isPhoneBound: false,
  userId: '',
  userCreatedAt: 0,
  userLastLoginAt: 0,
  subscriptionType: 'free',
  subscriptionExpiresAt: null,
};

export const useSessionStore = create<SessionState>()((set) => ({
  ...emptySession,

  refreshSession: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        set(emptySession);
        return;
      }
      const data = await res.json();
      if (data.success && data.user) {
        set({
          isLoggedIn: true,
          displayName: data.user.displayName || '学员',
          userPhone: data.user.phone || '',
          isPhoneBound: data.user.phoneBound ?? true,
          userId: data.user.id || '',
          userCreatedAt: data.user.createdAt || 0,
          userLastLoginAt: data.user.lastLoginAt || 0,
          subscriptionType: data.user.subscriptionType || 'free',
          subscriptionExpiresAt: data.user.subscriptionExpiresAt ?? null,
        });
      } else {
        set(emptySession);
      }
    } catch {
      // 网络异常时保留当前态，避免误登出
    }
  },

  sendOtp: async (payload) => {
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          phone: normalizePhone(payload.phone),
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
          isPhoneBound: data.user?.phoneBound ?? true,
          userId: data.user?.id || '',
          userCreatedAt: data.user?.createdAt || 0,
          userLastLoginAt: data.user?.lastLoginAt || 0,
          subscriptionType: 'free',
          subscriptionExpiresAt: null,
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
          isPhoneBound: data.user?.phoneBound ?? true,
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
          isPhoneBound: data.user?.phoneBound ?? true,
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

  bindPhone: async (payload) => {
    try {
      const res = await fetch('/api/auth/bind-phone', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          phone: normalizePhone(payload.phone),
          code: payload.code,
          password: payload.password,
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
          isPhoneBound: data.user?.phoneBound ?? true,
          userId: data.user?.id || '',
          userCreatedAt: data.user?.createdAt || 0,
          userLastLoginAt: data.user?.lastLoginAt || 0,
        });
        return { success: true, message: data.message || '绑定成功' };
      }
      return { success: false, message: data.error || '绑定失败' };
    } catch {
      return { success: false, message: '网络错误，请重试' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    set(emptySession);
  },

  isPhoneRegistered: async (_phoneInput) => {
    return false;
  },
}));


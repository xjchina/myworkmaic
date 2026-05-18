import { create } from 'zustand';

// ==================== Types ====================

export type SubscriptionType = 'free' | 'sub' | 'vip';

export interface SubscriptionPermissions {
  classroomDaily: number;
  knowledgeSteps: number;
  exerciseDaily: number;
  dataExport: boolean;
  analytics: 'day' | 'week' | 'full';
  dataHistory: 'today' | 'week' | 'full';
}

export interface SubscriptionData {
  subscriptionType: SubscriptionType;
  plan: string | null;
  status: string;
  expiresAt: string | null;
  remainingDays: number;
  permissions: SubscriptionPermissions;
}

interface UsageCheckResult {
  feature: string;
  usedToday: number;
  limitToday: number;
  remaining: number;
  canUse: boolean;
  upgradeTip?: string;
}

interface ShareStats {
  inviteCode: string;
  totalInvites: number;
  successfulInvites: number;
  totalRewards: number;
  pendingRewards: number;
}

interface SubscriptionState {
  // Data
  subscription: SubscriptionData | null;
  loading: boolean;

  // Usage cache (feature → result)
  usageCache: Record<string, UsageCheckResult>;

  // Share stats
  shareStats: ShareStats | null;

  // Actions
  fetchSubscription: () => Promise<SubscriptionData | null>;
  checkUsage: (feature: string) => Promise<UsageCheckResult>;
  logUsage: (feature: string, action?: string, subject?: string) => Promise<void>;
  redeemCode: (code: string) => Promise<{ success: boolean; message: string }>;
  fetchShareStats: () => Promise<ShareStats | null>;
  generateInviteLink: () => Promise<{ success: boolean; link?: string; message?: string }>;
  clearUsageCache: () => void;
}

// ==================== Helpers ====================

// ==================== Plan definitions (for UI display) ====================

export const PLAN_META: Record<
  SubscriptionType,
  { label: string; price: string; period: string; badge?: string; color: string; gradient: string }
> = {
  free: {
    label: '免费版',
    price: '¥0',
    period: '永久',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
  },
  sub: {
    label: '订阅会员',
    price: '¥29',
    period: '/月',
    badge: '推荐',
    color: '#4f46e5',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  },
  vip: {
    label: '年费 VIP',
    price: '¥199',
    period: '/年',
    badge: '超值',
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #f59e0b, #dc2626)',
  },
};

export const PERMISSION_LABELS: Record<keyof SubscriptionPermissions, { name: string; free: string; sub: string; vip: string }> = {
  classroomDaily: {
    name: '教案课堂',
    free: '每日 3 次',
    sub: '每日 30 次',
    vip: '无限使用',
  },
  knowledgeSteps: {
    name: '知识梳理',
    free: '基础 3 步',
    sub: '完整 5 步',
    vip: '完整 5 步',
  },
  exerciseDaily: {
    name: '互动练习',
    free: '每日 5 题',
    sub: '每日 50 题',
    vip: '无限练习',
  },
  dataExport: {
    name: '数据导出',
    free: '不可用',
    sub: '支持导出',
    vip: '支持导出',
  },
  analytics: {
    name: '统计分析',
    free: '当日统计',
    sub: '周度报告',
    vip: '全维度分析',
  },
  dataHistory: {
    name: '历史记录',
    free: '当日保留',
    sub: '一周留存',
    vip: '永久保存',
  },
};

// ==================== Store ====================

export const useSubscriptionStore = create<SubscriptionState>()((set, get) => ({
  subscription: null,
  loading: false,
  usageCache: {},
  shareStats: null,

  fetchSubscription: async () => {
    // Prevent concurrent duplicate calls
    if (get().loading) return get().subscription;
    set({ loading: true });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/user/subscription', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        set({ subscription: null, loading: false });
        return null;
      }
      const data = await res.json();
      if (data.success && data.data) {
        const sub = data.data as SubscriptionData;
        set({ subscription: sub, loading: false });
        return sub;
      }
      set({ subscription: null, loading: false });
      return null;
    } catch {
      set({ subscription: null, loading: false });
      return null;
    }
  },

  checkUsage: async (feature: string) => {
    // Return cached if available
    const cached = get().usageCache[feature];
    if (cached) return cached;

    try {
      const res = await fetch(`/api/usage/check?feature=${encodeURIComponent(feature)}`);
      if (!res.ok) {
        return { feature, usedToday: 0, limitToday: -1, remaining: -1, canUse: true };
      }
      const data = await res.json();
      if (data.success && data.data) {
        const result = data.data as UsageCheckResult;
        set((s) => ({ usageCache: { ...s.usageCache, [feature]: result } }));
        return result;
      }
      return { feature, usedToday: 0, limitToday: -1, remaining: -1, canUse: true };
    } catch {
      return { feature, usedToday: 0, limitToday: -1, remaining: -1, canUse: true };
    }
  },

  logUsage: async (feature: string, action?: string, subject?: string) => {
    try {
      await fetch('/api/usage/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, action, subject }),
      });

      // Invalidate cached usage for this feature so next check fetches fresh data
      set((s) => {
        const next = { ...s.usageCache };
        delete next[feature];
        return { usageCache: next };
      });
    } catch {
      // Silent fail — usage log non-critical
    }
  },

  redeemCode: async (code: string) => {
    try {
      const res = await fetch('/api/subscribe/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh subscription after successful redemption
        get().fetchSubscription();
        return { success: true, message: data.message || '兑换成功' };
      }
      return { success: false, message: data.error || '兑换失败' };
    } catch {
      return { success: false, message: '网络错误，请重试' };
    }
  },

  fetchShareStats: async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/share/stats', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        // Don't show share panel on error, silently degrade
        set({ shareStats: null });
        return null;
      }
      const data = await res.json();
      if (data.success && data.data) {
        set({ shareStats: data.data as ShareStats });
        return data.data as ShareStats;
      }
      return null;
    } catch {
      set({ shareStats: null });
      return null;
    }
  },

  generateInviteLink: async () => {
    try {
      const res = await fetch('/api/share/generate-link', { method: 'POST' });
      const data = await res.json();
      const link = data?.data?.link || data?.data?.inviteUrl;
      if (data.success && link) {
        return { success: true, link };
      }
      return { success: false, message: data.error || '生成失败' };
    } catch {
      return { success: false, message: '网络错误，请重试' };
    }
  },

  clearUsageCache: () => set({ usageCache: {} }),
}));

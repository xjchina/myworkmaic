/**
 * Subscription service layer
 * Handles membership status, permissions, usage tracking, code redemption.
 */

import { eq, and, gte, sql, count, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, subscriptions, subscriptionCodes, usageLogs, shareRewards } from '@/lib/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionType = 'free' | 'sub' | 'vip';
export type SubscriptionPlan = 'monthly' | 'yearly';

export interface Permissions {
  /** 每日教案课堂次数，-1 = 无限 */
  classroomDaily: number;
  /** 知识宇宙步数上限 */
  knowledgeSteps: number;
  /** 每日练习题数，-1 = 无限 */
  exerciseDaily: number;
  /** 是否可导出 */
  dataExport: boolean;
  /** 统计分析级别 */
  analytics: 'day' | 'week' | 'full';
  /** 历史记录保存范围 */
  dataHistory: 'today' | 'week' | 'full';
}

export interface SubscriptionStatus {
  subscriptionType: SubscriptionType;
  plan: SubscriptionPlan | null;
  status: 'active' | 'expired' | 'none';
  expiresAt: string | null;
  remainingDays: number;
  permissions: Permissions;
}

export interface UsageCheckResult {
  feature: string;
  usedToday: number;
  limitToday: number;
  remaining: number;
  canUse: boolean;
  upgradeTip?: string;
}

export type BillableFeature = 'classroom' | 'exercise' | 'knowledge';

export interface UsageConsumeResult extends UsageCheckResult {
  consumed: boolean;
  consumptionAction: string;
}

// ─── Permission table ─────────────────────────────────────────────────────────

const PERMISSIONS: Record<SubscriptionType, Permissions> = {
  free: {
    classroomDaily: 3,
    knowledgeSteps: 3,
    exerciseDaily: 5,
    dataExport: false,
    analytics: 'day',
    dataHistory: 'today',
  },
  sub: {
    classroomDaily: 30,
    knowledgeSteps: 5,
    exerciseDaily: 50,
    dataExport: true,
    analytics: 'week',
    dataHistory: 'week',
  },
  vip: {
    classroomDaily: -1,
    knowledgeSteps: 5,
    exerciseDaily: -1,
    dataExport: true,
    analytics: 'full',
    dataHistory: 'full',
  },
};

const UPGRADE_TIPS: Record<string, Record<SubscriptionType, string>> = {
  classroom: {
    free: '免费用户每日教案课堂限3次，开通订阅会员可使用30次，VIP 无限使用',
    sub: '订阅用户每日教案课堂限30次，升级年费 VIP 可无限使用',
    vip: '', // vip 不会触发
  },
  exercise: {
    free: '免费用户每日练习限5题，开通订阅会员可使用50题，VIP 无限使用',
    sub: '订阅用户每日练习限50题，升级年费 VIP 可无限使用',
    vip: '',
  },
  knowledge: {
    free: '免费用户知识梳理仅开放基础3步，升级会员解锁完整5步流程',
    sub: '已开通完整知识梳理5步',
    vip: '',
  },
};

const BILLABLE_FEATURES: readonly BillableFeature[] = ['classroom', 'exercise', 'knowledge'];
const USAGE_CONSUME_ACTION = 'quota_consume';

function isBillableFeature(feature: string): feature is BillableFeature {
  return BILLABLE_FEATURES.includes(feature as BillableFeature);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Resolve effective subscription type, auto-expire if overdue */
function resolveType(user: { subscriptionType: string; subscriptionExpiresAt: Date | null }): SubscriptionType {
  const raw = user.subscriptionType as SubscriptionType;
  if (raw === 'free') return 'free';
  if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
    return 'free'; // auto-degraded
  }
  return raw;
}

function remainingDays(expiresAt: Date | null): number {
  if (!expiresAt) return 0;
  const ms = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function generateId(): string {
  return crypto.randomUUID();
}

/** Generate XXXX-XXXX-XXXX-XXXX redemption code */
export function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

/** Generate 6-char alphanumeric invite code */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Subscription queries ─────────────────────────────────────────────────────

/** Get full subscription status for a user */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length === 0) return null;

  const user = userRows[0];
  const effectiveType = resolveType(user);

  // If user has degraded, update DB silently
  if (effectiveType !== user.subscriptionType) {
    await db.update(users).set({ subscriptionType: 'free', subscriptionExpiresAt: null }).where(eq(users.id, userId));
  }

  // Find latest active subscription record
  const subRows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .orderBy(sql`${subscriptions.expiresAt} DESC`)
    .limit(1);

  const sub = subRows[0] ?? null;

  return {
    subscriptionType: effectiveType,
    plan: sub ? (sub.plan as SubscriptionPlan) : null,
    status: sub ? 'active' : effectiveType !== 'free' ? 'active' : 'none',
    expiresAt: user.subscriptionExpiresAt ? user.subscriptionExpiresAt.toISOString().slice(0, 10) : null,
    remainingDays: remainingDays(user.subscriptionExpiresAt),
    permissions: PERMISSIONS[effectiveType],
  };
}

// ─── Usage tracking ───────────────────────────────────────────────────────────

/** Count today's consumed usage for a feature */
export async function countTodayUsage(
  userId: string,
  feature: string,
  consumeActions: string[] = [USAGE_CONSUME_ACTION],
): Promise<number> {
  const start = todayStart();
  const actionFilter =
    consumeActions.length === 1
      ? eq(usageLogs.action, consumeActions[0])
      : inArray(usageLogs.action, consumeActions);
  const rows = await db
    .select({ cnt: count() })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.feature, feature),
        actionFilter,
        gte(usageLogs.createdAt, start),
      ),
    );
  return Number(rows[0]?.cnt ?? 0);
}

/** Check whether the user can use a feature today */
export async function checkUsage(userId: string, feature: string): Promise<UsageCheckResult> {
  if (!isBillableFeature(feature)) {
    return { feature, usedToday: 0, limitToday: -1, remaining: -1, canUse: true };
  }

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length === 0) {
    return { feature, usedToday: 0, limitToday: 0, remaining: 0, canUse: false };
  }

  const user = userRows[0];
  const effectiveType = resolveType(user);
  const perms = PERMISSIONS[effectiveType];

  // Map feature → limit field
  const limitMap: Record<string, number> = {
    classroom: perms.classroomDaily,
    exercise: perms.exerciseDaily,
    knowledge: perms.knowledgeSteps, // for knowledge, limit = steps (checked differently)
  };

  const limit = limitMap[feature] ?? -1;

  // Unlimited
  if (limit === -1) {
    return {
      feature,
      usedToday: 0,
      limitToday: -1,
      remaining: -1,
      canUse: true,
    };
  }

  const usedToday = await countTodayUsage(userId, feature);
  const remaining = Math.max(0, limit - usedToday);
  const canUse = remaining > 0;

  return {
    feature,
    usedToday,
    limitToday: limit,
    remaining,
    canUse,
    upgradeTip: canUse
      ? undefined
      : UPGRADE_TIPS[feature]?.[effectiveType] ?? '今日次数已用完，升级会员获取更多次数',
  };
}

export async function consumeUsageWithTransaction(
  userId: string,
  feature: BillableFeature,
  data?: {
    /**
     * Deduplicate consumption by this key (per user/day/feature/action).
     * Recommended: classroom use stageId, exercise use quiz session id, knowledge use topic key.
     */
    dedupeKey?: string;
    subject?: string;
    durationSeconds?: number;
  },
): Promise<UsageConsumeResult> {
  const dedupeKey = data?.dedupeKey?.trim();
  const subject = data?.subject ?? null;
  const start = todayStart();

  return db.transaction(async (tx) => {
    // Serialize quota checks per user to prevent concurrent over-consumption.
    await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1 FOR UPDATE`);

    const userRows = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRows.length === 0) {
      return {
        feature,
        usedToday: 0,
        limitToday: 0,
        remaining: 0,
        canUse: false,
        consumed: false,
        consumptionAction: USAGE_CONSUME_ACTION,
      } satisfies UsageConsumeResult;
    }

    const user = userRows[0];
    const effectiveType = resolveType(user);
    if (effectiveType !== user.subscriptionType) {
      await tx
        .update(users)
        .set({ subscriptionType: 'free', subscriptionExpiresAt: null })
        .where(eq(users.id, userId));
    }

    const perms = PERMISSIONS[effectiveType];
    const limitMap: Record<BillableFeature, number> = {
      classroom: perms.classroomDaily,
      exercise: perms.exerciseDaily,
      knowledge: perms.knowledgeSteps,
    };
    const limit = limitMap[feature];

    if (dedupeKey) {
      const existing = await tx
        .select({ id: usageLogs.id })
        .from(usageLogs)
        .where(
          and(
            eq(usageLogs.userId, userId),
            eq(usageLogs.feature, feature),
            eq(usageLogs.action, USAGE_CONSUME_ACTION),
            eq(usageLogs.subject, dedupeKey),
            gte(usageLogs.createdAt, start),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const usedToday = await countTodayUsage(userId, feature);
        const remaining = limit === -1 ? -1 : Math.max(0, limit - usedToday);
        return {
          feature,
          usedToday,
          limitToday: limit,
          remaining,
          canUse: true,
          consumed: false,
          consumptionAction: USAGE_CONSUME_ACTION,
        } satisfies UsageConsumeResult;
      }
    }

    if (limit !== -1) {
      const usedRows = await tx
        .select({ cnt: count() })
        .from(usageLogs)
        .where(
          and(
            eq(usageLogs.userId, userId),
            eq(usageLogs.feature, feature),
            eq(usageLogs.action, USAGE_CONSUME_ACTION),
            gte(usageLogs.createdAt, start),
          ),
        );
      const usedToday = Number(usedRows[0]?.cnt ?? 0);
      const remainingBeforeConsume = Math.max(0, limit - usedToday);
      if (remainingBeforeConsume <= 0) {
        return {
          feature,
          usedToday,
          limitToday: limit,
          remaining: 0,
          canUse: false,
          upgradeTip:
            UPGRADE_TIPS[feature]?.[effectiveType] ?? '今日次数已用完，升级会员获取更多次数',
          consumed: false,
          consumptionAction: USAGE_CONSUME_ACTION,
        } satisfies UsageConsumeResult;
      }
    }

    await tx.insert(usageLogs).values({
      id: generateId(),
      userId,
      feature,
      action: USAGE_CONSUME_ACTION,
      subject: dedupeKey || subject,
      durationSeconds: data?.durationSeconds ?? null,
    });

    const usedAfterRows = await tx
      .select({ cnt: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, userId),
          eq(usageLogs.feature, feature),
          eq(usageLogs.action, USAGE_CONSUME_ACTION),
          gte(usageLogs.createdAt, start),
        ),
      );
    const usedAfter = Number(usedAfterRows[0]?.cnt ?? 0);
    const remaining = limit === -1 ? -1 : Math.max(0, limit - usedAfter);

    return {
      feature,
      usedToday: usedAfter,
      limitToday: limit,
      remaining,
      canUse: true,
      consumed: true,
      consumptionAction: USAGE_CONSUME_ACTION,
    } satisfies UsageConsumeResult;
  });
}

/** Write a usage log entry */
export async function logUsage(
  userId: string,
  data: {
    feature: string;
    action?: string;
    subject?: string;
    durationSeconds?: number;
  },
): Promise<void> {
  await db.insert(usageLogs).values({
    id: generateId(),
    userId,
    feature: data.feature,
    action: data.action ?? null,
    subject: data.subject ?? null,
    durationSeconds: data.durationSeconds ?? null,
  });
}

// ─── Subscription code redemption ────────────────────────────────────────────

const PLAN_DAYS: Record<SubscriptionPlan, number> = {
  monthly: 30,
  yearly: 365,
};

/** Verify and redeem a subscription code */
export async function redeemCode(
  userId: string,
  rawCode: string,
): Promise<{ success: boolean; message: string; expiresAt?: string; remainingDays?: number }> {
  const code = rawCode.trim().toUpperCase();

  // Look up code
  const codeRows = await db
    .select()
    .from(subscriptionCodes)
    .where(eq(subscriptionCodes.code, code))
    .limit(1);

  if (codeRows.length === 0) {
    return { success: false, message: '订阅码无效或已使用' };
  }

  const codeRow = codeRows[0];
  if (codeRow.isUsed) {
    return { success: false, message: '订阅码无效或已使用' };
  }

  const plan = codeRow.plan as SubscriptionPlan;
  const days = PLAN_DAYS[plan] ?? 30;
  const newType: SubscriptionType = plan === 'yearly' ? 'vip' : 'sub';

  // Calculate new expiry: extend from current expiry or now
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  const base =
    user?.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()
      ? user.subscriptionExpiresAt
      : new Date();
  const expiresAt = new Date(base.getTime() + days * 86_400_000);

  // Update user
  await db.update(users).set({ subscriptionType: newType, subscriptionExpiresAt: expiresAt }).where(eq(users.id, userId));

  // Mark code used
  await db
    .update(subscriptionCodes)
    .set({ isUsed: true, usedBy: userId, usedAt: new Date() })
    .where(eq(subscriptionCodes.code, code));

  // Insert subscription record
  await db.insert(subscriptions).values({
    id: generateId(),
    userId,
    plan,
    status: 'active',
    startedAt: new Date(),
    expiresAt,
  });

  // Handle invite reward (if user was invited)
  if (user?.invitedBy) {
    await grantInviteReward(user.invitedBy, userId);
  }

  return {
    success: true,
    message: '订阅成功',
    expiresAt: expiresAt.toISOString().slice(0, 10),
    remainingDays: days,
  };
}

/** Create subscription from payment callback */
export async function createSubscription(data: {
  userId: string;
  plan: SubscriptionPlan;
  paymentId?: string;
  amount?: number;
}): Promise<{ success: boolean; subscriptionId?: string; expiresAt?: string; message?: string }> {
  const days = PLAN_DAYS[data.plan] ?? 30;
  const newType: SubscriptionType = data.plan === 'yearly' ? 'vip' : 'sub';

  const userRows = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const user = userRows[0];
  if (!user) return { success: false, message: '用户不存在' };

  const base =
    user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()
      ? user.subscriptionExpiresAt
      : new Date();
  const expiresAt = new Date(base.getTime() + days * 86_400_000);

  await db.update(users).set({ subscriptionType: newType, subscriptionExpiresAt: expiresAt }).where(eq(users.id, data.userId));

  const id = generateId();
  await db.insert(subscriptions).values({
    id,
    userId: data.userId,
    plan: data.plan,
    status: 'active',
    paymentId: data.paymentId ?? null,
    amount: data.amount ?? null,
    startedAt: new Date(),
    expiresAt,
  });

  // Handle invite reward
  if (user.invitedBy) {
    await grantInviteReward(user.invitedBy, data.userId);
  }

  return { success: true, subscriptionId: id, expiresAt: expiresAt.toISOString().slice(0, 10) };
}

// ─── Invite / share ───────────────────────────────────────────────────────────

/** Ensure user has an invite code, generate one if missing */
export async function ensureInviteCode(userId: string): Promise<string> {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new Error('User not found');

  if (user.inviteCode) return user.inviteCode;

  // Generate unique code
  let code = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(users).where(eq(users.inviteCode, code)).limit(1);
    if (existing.length === 0) break;
    code = generateInviteCode();
    attempts++;
  }

  await db.update(users).set({ inviteCode: code }).where(eq(users.id, userId));
  return code;
}

/** Grant invite reward (30-day VIP extension) to inviter when invitee subscribes */
async function grantInviteReward(inviterId: string, inviteeId: string): Promise<void> {
  // Only grant once per pair
  const existing = await db
    .select()
    .from(shareRewards)
    .where(and(eq(shareRewards.inviterId, inviterId), eq(shareRewards.inviteeId, inviteeId)))
    .limit(1);
  if (existing.length > 0) return;

  const rewardDays = 30;

  // Extend inviter's subscription
  const inviterRows = await db.select().from(users).where(eq(users.id, inviterId)).limit(1);
  const inviter = inviterRows[0];
  if (!inviter) return;

  const base =
    inviter.subscriptionExpiresAt && inviter.subscriptionExpiresAt > new Date()
      ? inviter.subscriptionExpiresAt
      : new Date();
  const newExpiry = new Date(base.getTime() + rewardDays * 86_400_000);

  // Ensure at least "sub" level
  const currentType = resolveType(inviter);
  const newType: SubscriptionType = currentType === 'vip' ? 'vip' : 'sub';

  await db
    .update(users)
    .set({ subscriptionType: newType, subscriptionExpiresAt: newExpiry })
    .where(eq(users.id, inviterId));

  // Record reward
  await db.insert(shareRewards).values({
    id: generateId(),
    inviterId,
    inviteeId,
    rewardDays,
    status: 'granted',
    grantedAt: new Date(),
  });
}

/** Get share stats for a user */
export async function getShareStats(userId: string) {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return null;

  const inviteCode = await ensureInviteCode(userId);

  const rewardRows = await db
    .select()
    .from(shareRewards)
    .where(eq(shareRewards.inviterId, userId));

  // Count total invitees (users who used this invite code)
  const inviteeRows = await db.select().from(users).where(eq(users.invitedBy, userId));
  const totalInvites = inviteeRows.length;
  const successfulInvites = rewardRows.filter((r) => r.status === 'granted').length;
  const totalRewards = rewardRows.filter((r) => r.status === 'granted').length;
  const pendingRewards = rewardRows.filter((r) => r.status === 'pending').length;

  return {
    inviteCode,
    totalInvites,
    successfulInvites,
    totalRewards,
    pendingRewards,
  };
}

// ─── Promotion ────────────────────────────────────────────────────────────────

const VIP_BENEFITS = [
  '教案课堂无限次使用',
  '练习互动无限次',
  '完整知识梳理5步法',
  '学习数据完整历史保存',
  '多维度统计分析',
  '学习数据全部导出',
];

const FEATURE_TITLES: Record<string, { title: string; message: (type: SubscriptionType) => string }> = {
  classroom: {
    title: '今日教案课堂次数已用完',
    message: (t) =>
      t === 'free'
        ? '免费用户每日可使用3次，开通订阅会员升至30次，VIP 无限使用'
        : '订阅会员每日可使用30次，升级年费 VIP 可无限使用',
  },
  exercise: {
    title: '今日练习次数已用完',
    message: (t) =>
      t === 'free'
        ? '免费用户每日可练习5题，开通订阅会员升至50题，VIP 无限使用'
        : '订阅会员每日可练习50题，升级年费 VIP 可无限使用',
  },
  export: {
    title: '数据导出为会员专属功能',
    message: () => '开通订阅会员即可导出 Excel 学习数据',
  },
  analytics: {
    title: '高级统计分析为 VIP 专属',
    message: () => '升级年费 VIP 解锁多维度学习分析报告',
  },
};

export async function getUpgradeTip(userId: string, feature: string) {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return null;

  const effectiveType = resolveType(user);
  const meta = FEATURE_TITLES[feature] ?? FEATURE_TITLES['classroom'];

  return {
    showUpgrade: true,
    title: meta.title,
    message: meta.message(effectiveType),
    vipBenefits: VIP_BENEFITS,
    upgradeUrl: '/subscribe',
  };
}

// ─── Admin: batch create codes ────────────────────────────────────────────────

/** Generate N redemption codes for a given plan (admin utility) */
export async function batchCreateCodes(plan: SubscriptionPlan, count_: number): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < count_; i++) {
    let code = generateRedemptionCode();
    // Ensure uniqueness
    let exists = true;
    while (exists) {
      const rows = await db.select().from(subscriptionCodes).where(eq(subscriptionCodes.code, code)).limit(1);
      if (rows.length === 0) {
        exists = false;
      } else {
        code = generateRedemptionCode();
      }
    }
    await db.insert(subscriptionCodes).values({ id: generateId(), code, plan });
    codes.push(code);
  }
  return codes;
}

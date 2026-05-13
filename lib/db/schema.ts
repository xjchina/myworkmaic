import {
  mysqlTable,
  varchar,
  timestamp,
  int,
  boolean,
  index,
} from 'drizzle-orm/mysql-core';

/**
 * Users table — stores registered user accounts
 */
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  phone: varchar('phone', { length: 11 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 50 }).notNull().default('学员'),
  avatar: varchar('avatar', { length: 500 }),
  // ── Membership fields ──
  subscriptionType: varchar('subscription_type', { length: 20 }).notNull().default('free'), // free | sub | vip
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  inviteCode: varchar('invite_code', { length: 20 }).unique(), // 用户自己的邀请码
  invitedBy: varchar('invited_by', { length: 36 }),            // 邀请人 userId
  // ──────────────────────
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at').notNull().defaultNow(),
});

/**
 * OTP tickets table — stores verification codes for phone auth
 */
export const otpTickets = mysqlTable('otp_tickets', {
  phone: varchar('phone', { length: 11 }).primaryKey(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  lastSentAt: timestamp('last_sent_at').notNull(),
  attempts: int('attempts').notNull().default(0),
});

/**
 * Subscriptions table — tracks each subscription period per user
 */
export const subscriptions = mysqlTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  plan: varchar('plan', { length: 20 }).notNull(),           // monthly | yearly
  status: varchar('status', { length: 20 }).notNull().default('active'), // active | expired | cancelled
  paymentId: varchar('payment_id', { length: 100 }),         // 支付订单号
  amount: int('amount'),                                     // 支付金额（分）
  startedAt: timestamp('started_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  autoRenew: boolean('auto_renew').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
}));

/**
 * Subscription codes table — pre-generated redemption codes
 */
export const subscriptionCodes = mysqlTable('subscription_codes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // XXXX-XXXX-XXXX-XXXX
  plan: varchar('plan', { length: 20 }).notNull(),           // monthly | yearly
  isUsed: boolean('is_used').notNull().default(false),
  usedBy: varchar('used_by', { length: 36 }),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Usage logs table — records feature usage per user per day
 */
export const usageLogs = mysqlTable('usage_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  feature: varchar('feature', { length: 50 }).notNull(),     // classroom | knowledge | exercise
  action: varchar('action', { length: 50 }),                 // start | complete | error
  subject: varchar('subject', { length: 100 }),
  durationSeconds: int('duration_seconds'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userFeatureIdx: index('usage_logs_user_feature_idx').on(table.userId, table.feature),
  createdAtIdx: index('usage_logs_created_at_idx').on(table.createdAt),
}));

/**
 * Share rewards table — tracks invite rewards
 */
export const shareRewards = mysqlTable('share_rewards', {
  id: varchar('id', { length: 36 }).primaryKey(),
  inviterId: varchar('inviter_id', { length: 36 }).notNull(), // 邀请人
  inviteeId: varchar('invitee_id', { length: 36 }).notNull(), // 被邀请人
  rewardDays: int('reward_days').notNull().default(30),        // 奖励天数
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | granted
  grantedAt: timestamp('granted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  inviterIdx: index('share_rewards_inviter_idx').on(table.inviterId),
}));

import {
  mysqlTable,
  varchar,
  timestamp,
  int,
  boolean,
  text,
  index,
  uniqueIndex,
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
  wechatOpenId: varchar('wechat_open_id', { length: 64 }).unique(),
  wechatUnionId: varchar('wechat_union_id', { length: 64 }).unique(),
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
 * Captcha tickets table - one-time captcha challenges
 */
export const captchaTickets = mysqlTable('captcha_tickets', {
  id: varchar('id', { length: 36 }).primaryKey(),
  answer: varchar('answer', { length: 8 }).notNull(),
  issuedIp: varchar('issued_ip', { length: 64 }).notNull(),
  issuedDevice: varchar('issued_device', { length: 128 }).notNull(),
  attempts: int('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Auth events table - audit and rate-limiting counters
 */
export const authEvents = mysqlTable('auth_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  action: varchar('action', { length: 32 }).notNull(), // send_code | login | register | captcha
  scope: varchar('scope', { length: 16 }).notNull(), // ip | device | phone
  identifier: varchar('identifier', { length: 128 }).notNull(),
  success: boolean('success').notNull(),
  reason: varchar('reason', { length: 64 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  scopeIdentifierIdx: index('auth_events_scope_identifier_idx').on(table.scope, table.identifier),
  actionCreatedIdx: index('auth_events_action_created_idx').on(table.action, table.createdAt),
}));

/**
 * Auth bans table - temporary lock for suspicious behavior
 */
export const authBans = mysqlTable('auth_bans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  scope: varchar('scope', { length: 16 }).notNull(), // ip | device | phone
  identifier: varchar('identifier', { length: 128 }).notNull(),
  reason: varchar('reason', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  scopeIdentifierUnique: uniqueIndex('auth_bans_scope_identifier_unique').on(table.scope, table.identifier),
  expiresAtIdx: index('auth_bans_expires_at_idx').on(table.expiresAt),
}));

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
 * WeChat payment orders table - tracks real payment lifecycle before granting membership.
 */
export const wechatPaymentOrders = mysqlTable('wechat_payment_orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  outTradeNo: varchar('out_trade_no', { length: 32 }).notNull(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  plan: varchar('plan', { length: 20 }).notNull(), // monthly | yearly
  channel: varchar('channel', { length: 16 }).notNull().default('native'), // native | jsapi
  amount: int('amount').notNull(), // cents
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | paid | closed | failed
  description: varchar('description', { length: 127 }).notNull(),
  codeUrl: text('code_url'),
  prepayId: varchar('prepay_id', { length: 128 }),
  transactionId: varchar('transaction_id', { length: 64 }),
  payerOpenId: varchar('payer_open_id', { length: 128 }),
  notifyJson: text('notify_json'),
  paidAt: timestamp('paid_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  outTradeNoIdx: uniqueIndex('wechat_payment_orders_out_trade_no_unique').on(table.outTradeNo),
  userCreatedIdx: index('wechat_payment_orders_user_created_idx').on(table.userId, table.createdAt),
  statusIdx: index('wechat_payment_orders_status_idx').on(table.status),
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

/**
 * User messages table - in-app notifications.
 */
export const userMessages = mysqlTable('user_messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  category: varchar('category', { length: 24 }).notNull(), // system | learning | security | membership | activity
  title: varchar('title', { length: 120 }).notNull(),
  content: text('content').notNull(),
  actionUrl: varchar('action_url', { length: 500 }),
  metaJson: text('meta_json'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userCreatedIdx: index('user_messages_user_created_idx').on(table.userId, table.createdAt),
  userReadIdx: index('user_messages_user_read_idx').on(table.userId, table.isRead),
  userCategoryIdx: index('user_messages_user_category_idx').on(table.userId, table.category),
}));

/**
 * Ops knowledge prompt versions table.
 *
 * status: draft | published | archived
 * mode: dialog | quick
 */
export const opsKnowledgePromptVersions = mysqlTable('ops_knowledge_prompt_versions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  subject: varchar('subject', { length: 32 }).notNull(), // 语文/数学/英语/物理/化学/生物/历史/地理/道法/通用
  gradeSegment: varchar('grade_segment', { length: 32 }).notNull(), // 小学/初中/高中/通用
  mode: varchar('mode', { length: 16 }).notNull(), // dialog | quick
  stepKey: varchar('step_key', { length: 32 }).notNull().default('global'),
  version: int('version').notNull(),
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  name: varchar('name', { length: 120 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  teachingStyle: text('teaching_style').notNull(),
  outputFormat: text('output_format').notNull(),
  safetyConstraints: text('safety_constraints').notNull(),
  antiDivergenceRules: text('anti_divergence_rules').notNull(),
  variablesJson: text('variables_json'),
  rollbackFromVersionId: varchar('rollback_from_version_id', { length: 36 }),
  createdBy: varchar('created_by', { length: 64 }).notNull(),
  publishedBy: varchar('published_by', { length: 64 }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  dimVersionUnique: uniqueIndex('ops_kp_dim_version_unique').on(
    table.subject,
    table.gradeSegment,
    table.mode,
    table.stepKey,
    table.version,
  ),
  dimStatusIdx: index('ops_kp_dim_status_idx').on(table.subject, table.gradeSegment, table.mode, table.stepKey, table.status),
  createdAtIdx: index('ops_kp_created_at_idx').on(table.createdAt),
}));

/**
 * Ops message templates table.
 */
export const opsMessageTemplates = mysqlTable('ops_message_templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  category: varchar('category', { length: 24 }).notNull().default('system'),
  titleTemplate: varchar('title_template', { length: 120 }).notNull(),
  contentTemplate: text('content_template').notNull(),
  actionUrl: varchar('action_url', { length: 500 }),
  variablesJson: text('variables_json'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdBy: varchar('created_by', { length: 64 }).notNull(),
  updatedBy: varchar('updated_by', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameUnique: uniqueIndex('ops_msg_tpl_name_unique').on(table.name),
  enabledIdx: index('ops_msg_tpl_enabled_idx').on(table.isEnabled),
}));

/**
 * Ops preset content table.
 */
export const opsPresetContents = mysqlTable('ops_preset_contents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  contentType: varchar('content_type', { length: 24 }).notNull(), // classroom | exercise | download
  title: varchar('title', { length: 120 }).notNull(),
  summary: text('summary'),
  payloadJson: text('payload_json').notNull(),
  sortOrder: int('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  createdBy: varchar('created_by', { length: 64 }).notNull(),
  updatedBy: varchar('updated_by', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  typeVisibleSortIdx: index('ops_preset_type_visible_sort_idx').on(
    table.contentType,
    table.isVisible,
    table.sortOrder,
  ),
}));

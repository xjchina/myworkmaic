-- 会员功能 schema 升级
-- 在已有数据库上执行，只补充缺少的列和表

-- ① 给 users 表补充 4 个会员字段
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `subscription_type`       VARCHAR(20)  NOT NULL DEFAULT 'free'
    COMMENT 'free | sub | vip',
  ADD COLUMN IF NOT EXISTS `subscription_expires_at` DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS `invite_code`             VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS `invited_by`              VARCHAR(36)  NULL;

-- 唯一约束（如果还没有）
ALTER TABLE `users`
  ADD CONSTRAINT `users_invite_code_unique` UNIQUE (`invite_code`);

-- ② 订阅记录表
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`          VARCHAR(36)  NOT NULL,
  `user_id`     VARCHAR(36)  NOT NULL,
  `plan`        VARCHAR(20)  NOT NULL COMMENT 'monthly | yearly',
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'active' COMMENT 'active | expired | cancelled',
  `payment_id`  VARCHAR(100) NULL,
  `amount`      INT          NULL,
  `started_at`  DATETIME     NOT NULL,
  `expires_at`  DATETIME     NOT NULL,
  `auto_renew`  BOOLEAN      NOT NULL DEFAULT FALSE,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `subscriptions_id` PRIMARY KEY (`id`),
  INDEX `subscriptions_user_id_idx` (`user_id`)
);

-- ③ 订阅码表
CREATE TABLE IF NOT EXISTS `subscription_codes` (
  `id`          VARCHAR(36)  NOT NULL,
  `code`        VARCHAR(50)  NOT NULL,
  `plan`        VARCHAR(20)  NOT NULL COMMENT 'monthly | yearly',
  `is_used`     BOOLEAN      NOT NULL DEFAULT FALSE,
  `used_by`     VARCHAR(36)  NULL,
  `used_at`     DATETIME     NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `subscription_codes_id`          PRIMARY KEY (`id`),
  CONSTRAINT `subscription_codes_code_unique` UNIQUE (`code`)
);

-- ④ 使用记录表
CREATE TABLE IF NOT EXISTS `usage_logs` (
  `id`               VARCHAR(36)  NOT NULL,
  `user_id`          VARCHAR(36)  NOT NULL,
  `feature`          VARCHAR(50)  NOT NULL COMMENT 'classroom | knowledge | exercise',
  `action`           VARCHAR(50)  NULL,
  `subject`          VARCHAR(100) NULL,
  `duration_seconds` INT          NULL,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `usage_logs_id` PRIMARY KEY (`id`),
  INDEX `usage_logs_user_feature_idx` (`user_id`, `feature`),
  INDEX `usage_logs_created_at_idx`   (`created_at`)
);

-- ⑤ 邀请奖励表
CREATE TABLE IF NOT EXISTS `share_rewards` (
  `id`          VARCHAR(36)  NOT NULL,
  `inviter_id`  VARCHAR(36)  NOT NULL,
  `invitee_id`  VARCHAR(36)  NOT NULL,
  `reward_days` INT          NOT NULL DEFAULT 30,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT 'pending | granted',
  `granted_at`  DATETIME     NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `share_rewards_id` PRIMARY KEY (`id`),
  INDEX `share_rewards_inviter_idx` (`inviter_id`)
);

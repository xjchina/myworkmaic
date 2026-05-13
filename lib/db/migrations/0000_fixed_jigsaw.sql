CREATE TABLE `otp_tickets` (
	`phone` varchar(11) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`last_sent_at` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	CONSTRAINT `otp_tickets_phone` PRIMARY KEY(`phone`)
);
--> statement-breakpoint
CREATE TABLE `share_rewards` (
	`id` varchar(36) NOT NULL,
	`inviter_id` varchar(36) NOT NULL,
	`invitee_id` varchar(36) NOT NULL,
	`reward_days` int NOT NULL DEFAULT 30,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`granted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `share_rewards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_codes` (
	`id` varchar(36) NOT NULL,
	`code` varchar(50) NOT NULL,
	`plan` varchar(20) NOT NULL,
	`is_used` boolean NOT NULL DEFAULT false,
	`used_by` varchar(36),
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`plan` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`payment_id` varchar(100),
	`amount` int,
	`started_at` timestamp NOT NULL,
	`expires_at` timestamp NOT NULL,
	`auto_renew` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`feature` varchar(50) NOT NULL,
	`action` varchar(50),
	`subject` varchar(100),
	`duration_seconds` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`phone` varchar(11) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`display_name` varchar(50) NOT NULL DEFAULT '学员',
	`avatar` varchar(500),
	`subscription_type` varchar(20) NOT NULL DEFAULT 'free',
	`subscription_expires_at` timestamp,
	`invite_code` varchar(20),
	`invited_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_login_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`),
	CONSTRAINT `users_invite_code_unique` UNIQUE(`invite_code`)
);
--> statement-breakpoint
CREATE INDEX `share_rewards_inviter_idx` ON `share_rewards` (`inviter_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_id_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `usage_logs_user_feature_idx` ON `usage_logs` (`user_id`,`feature`);--> statement-breakpoint
CREATE INDEX `usage_logs_created_at_idx` ON `usage_logs` (`created_at`);
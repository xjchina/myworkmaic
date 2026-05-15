CREATE TABLE `captcha_tickets` (
  `id` varchar(36) NOT NULL,
  `answer` varchar(8) NOT NULL,
  `issued_ip` varchar(64) NOT NULL,
  `issued_device` varchar(128) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `captcha_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_events` (
  `id` varchar(36) NOT NULL,
  `action` varchar(32) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `identifier` varchar(128) NOT NULL,
  `success` boolean NOT NULL,
  `reason` varchar(64),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `auth_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_bans` (
  `id` varchar(36) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `identifier` varchar(128) NOT NULL,
  `reason` varchar(128) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `auth_bans_id` PRIMARY KEY(`id`),
  CONSTRAINT `auth_bans_scope_identifier_unique` UNIQUE(`scope`,`identifier`)
);
--> statement-breakpoint
CREATE INDEX `auth_events_scope_identifier_idx` ON `auth_events` (`scope`,`identifier`);
--> statement-breakpoint
CREATE INDEX `auth_events_action_created_idx` ON `auth_events` (`action`,`created_at`);
--> statement-breakpoint
CREATE INDEX `auth_bans_expires_at_idx` ON `auth_bans` (`expires_at`);

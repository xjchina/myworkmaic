CREATE TABLE IF NOT EXISTS `wechat_payment_orders` (
  `id` varchar(36) NOT NULL,
  `out_trade_no` varchar(32) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `plan` varchar(20) NOT NULL,
  `channel` varchar(16) NOT NULL DEFAULT 'native',
  `amount` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `description` varchar(127) NOT NULL,
  `code_url` text,
  `prepay_id` varchar(128),
  `transaction_id` varchar(64),
  `payer_open_id` varchar(128),
  `notify_json` text,
  `paid_at` timestamp NULL,
  `expires_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `wechat_payment_orders_id` PRIMARY KEY (`id`),
  CONSTRAINT `wechat_payment_orders_out_trade_no_unique` UNIQUE (`out_trade_no`)
);

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'wechat_payment_orders'
    AND index_name = 'wechat_payment_orders_user_created_idx'
);
SET @idx_sql := IF(
  @idx_exists = 0,
  'CREATE INDEX `wechat_payment_orders_user_created_idx` ON `wechat_payment_orders` (`user_id`, `created_at`)',
  'SELECT 1'
);
PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'wechat_payment_orders'
    AND index_name = 'wechat_payment_orders_status_idx'
);
SET @idx_sql := IF(
  @idx_exists = 0,
  'CREATE INDEX `wechat_payment_orders_status_idx` ON `wechat_payment_orders` (`status`)',
  'SELECT 1'
);
PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

-- WeChat scan login fields for users table
-- Compatible with environments where `ADD COLUMN IF NOT EXISTS` is unavailable.

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'wechat_open_id'
    ),
    'SELECT "skip wechat_open_id"',
    "ALTER TABLE users ADD COLUMN wechat_open_id VARCHAR(64) NULL"
  )
);
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'wechat_union_id'
    ),
    'SELECT "skip wechat_union_id"',
    "ALTER TABLE users ADD COLUMN wechat_union_id VARCHAR(64) NULL"
  )
);
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'users_wechat_open_id_unique'
    ),
    'SELECT "skip users_wechat_open_id_unique"',
    "ALTER TABLE users ADD CONSTRAINT users_wechat_open_id_unique UNIQUE (wechat_open_id)"
  )
);
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'users_wechat_union_id_unique'
    ),
    'SELECT "skip users_wechat_union_id_unique"',
    "ALTER TABLE users ADD CONSTRAINT users_wechat_union_id_unique UNIQUE (wechat_union_id)"
  )
);
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;

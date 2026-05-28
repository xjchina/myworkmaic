SET @ops_kp_step_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ops_knowledge_prompt_versions'
    AND COLUMN_NAME = 'step_key'
);

SET @ops_kp_step_col_sql := IF(
  @ops_kp_step_col_exists = 0,
  'ALTER TABLE `ops_knowledge_prompt_versions` ADD COLUMN `step_key` varchar(32) NOT NULL DEFAULT ''global'' AFTER `mode`',
  'SELECT 1'
);
PREPARE ops_kp_step_col_stmt FROM @ops_kp_step_col_sql;
EXECUTE ops_kp_step_col_stmt;
DEALLOCATE PREPARE ops_kp_step_col_stmt;

SET @ops_kp_unique_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ops_knowledge_prompt_versions'
    AND INDEX_NAME = 'ops_kp_dim_version_unique'
);

SET @ops_kp_unique_drop_sql := IF(
  @ops_kp_unique_exists > 0,
  'ALTER TABLE `ops_knowledge_prompt_versions` DROP INDEX `ops_kp_dim_version_unique`',
  'SELECT 1'
);
PREPARE ops_kp_unique_drop_stmt FROM @ops_kp_unique_drop_sql;
EXECUTE ops_kp_unique_drop_stmt;
DEALLOCATE PREPARE ops_kp_unique_drop_stmt;

ALTER TABLE `ops_knowledge_prompt_versions`
  ADD UNIQUE KEY `ops_kp_dim_version_unique` (`subject`, `grade_segment`, `mode`, `step_key`, `version`);

SET @ops_kp_status_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ops_knowledge_prompt_versions'
    AND INDEX_NAME = 'ops_kp_dim_status_idx'
);

SET @ops_kp_status_drop_sql := IF(
  @ops_kp_status_exists > 0,
  'ALTER TABLE `ops_knowledge_prompt_versions` DROP INDEX `ops_kp_dim_status_idx`',
  'SELECT 1'
);
PREPARE ops_kp_status_drop_stmt FROM @ops_kp_status_drop_sql;
EXECUTE ops_kp_status_drop_stmt;
DEALLOCATE PREPARE ops_kp_status_drop_stmt;

ALTER TABLE `ops_knowledge_prompt_versions`
  ADD KEY `ops_kp_dim_status_idx` (`subject`, `grade_segment`, `mode`, `step_key`, `status`);

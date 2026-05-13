// 会员功能数据库升级脚本 (CommonJS)
const mysql = require('mysql2/promise');

async function run() {
  const DB_URL = 'mysql://openmaic:openmaic_pass@localhost:3306/openmaic';
  const conn = await mysql.createConnection(DB_URL);

  async function columnExists(table, col) {
    const [rows] = await conn.query(
      'SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?',
      [table, col]
    );
    return rows[0].cnt > 0;
  }

  async function tableExists(table) {
    const [rows] = await conn.query(
      'SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?',
      [table]
    );
    return rows[0].cnt > 0;
  }

  async function indexExists(table, idx) {
    const [rows] = await conn.query(
      'SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=?',
      [table, idx]
    );
    return rows[0].cnt > 0;
  }

  // ── 1. 给 users 表补会员列 ─────────────────────────────────
  console.log('=== 1. 给 users 表补充会员字段 ===');

  const cols = [
    { name: 'subscription_type',       ddl: "ADD COLUMN `subscription_type` VARCHAR(20) NOT NULL DEFAULT 'free'" },
    { name: 'subscription_expires_at', ddl: 'ADD COLUMN `subscription_expires_at` DATETIME NULL' },
    { name: 'invite_code',             ddl: 'ADD COLUMN `invite_code` VARCHAR(20) NULL' },
    { name: 'invited_by',              ddl: 'ADD COLUMN `invited_by` VARCHAR(36) NULL' },
  ];

  for (const col of cols) {
    if (await columnExists('users', col.name)) {
      console.log('  ⚠️  已存在，跳过:', col.name);
    } else {
      await conn.query('ALTER TABLE `users` ' + col.ddl);
      console.log('  ✅  添加列:', col.name);
    }
  }

  if (!(await indexExists('users', 'users_invite_code_unique'))) {
    await conn.query('ALTER TABLE `users` ADD CONSTRAINT `users_invite_code_unique` UNIQUE (`invite_code`)');
    console.log('  ✅  添加唯一索引: invite_code');
  } else {
    console.log('  ⚠️  已存在，跳过: invite_code unique');
  }

  // ── 2. 创建新表 ─────────────────────────────────────────────
  console.log('\n=== 2. 创建会员相关新表 ===');

  const tableSqls = {
    subscriptions: [
      'CREATE TABLE `subscriptions` (',
      '  `id`          VARCHAR(36)  NOT NULL,',
      '  `user_id`     VARCHAR(36)  NOT NULL,',
      '  `plan`        VARCHAR(20)  NOT NULL,',
      "  `status`      VARCHAR(20)  NOT NULL DEFAULT 'active',",
      '  `payment_id`  VARCHAR(100) NULL,',
      '  `amount`      INT          NULL,',
      '  `started_at`  DATETIME     NOT NULL,',
      '  `expires_at`  DATETIME     NOT NULL,',
      '  `auto_renew`  BOOLEAN      NOT NULL DEFAULT FALSE,',
      '  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      '  PRIMARY KEY (`id`),',
      '  INDEX `subscriptions_user_id_idx` (`user_id`)',
      ')',
    ].join('\n'),

    subscription_codes: [
      'CREATE TABLE `subscription_codes` (',
      '  `id`         VARCHAR(36) NOT NULL,',
      '  `code`       VARCHAR(50) NOT NULL,',
      '  `plan`       VARCHAR(20) NOT NULL,',
      '  `is_used`    BOOLEAN     NOT NULL DEFAULT FALSE,',
      '  `used_by`    VARCHAR(36) NULL,',
      '  `used_at`    DATETIME    NULL,',
      '  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      '  PRIMARY KEY (`id`),',
      '  UNIQUE KEY `subscription_codes_code_unique` (`code`)',
      ')',
    ].join('\n'),

    usage_logs: [
      'CREATE TABLE `usage_logs` (',
      '  `id`               VARCHAR(36) NOT NULL,',
      '  `user_id`          VARCHAR(36) NOT NULL,',
      '  `feature`          VARCHAR(50) NOT NULL,',
      '  `action`           VARCHAR(50) NULL,',
      '  `subject`          VARCHAR(100) NULL,',
      '  `duration_seconds` INT NULL,',
      '  `created_at`       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      '  PRIMARY KEY (`id`),',
      '  INDEX `usage_logs_user_feature_idx` (`user_id`, `feature`),',
      '  INDEX `usage_logs_created_at_idx`   (`created_at`)',
      ')',
    ].join('\n'),

    share_rewards: [
      'CREATE TABLE `share_rewards` (',
      '  `id`          VARCHAR(36) NOT NULL,',
      '  `inviter_id`  VARCHAR(36) NOT NULL,',
      '  `invitee_id`  VARCHAR(36) NOT NULL,',
      '  `reward_days` INT         NOT NULL DEFAULT 30,',
      "  `status`      VARCHAR(20) NOT NULL DEFAULT 'pending',",
      '  `granted_at`  DATETIME    NULL,',
      '  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      '  PRIMARY KEY (`id`),',
      '  INDEX `share_rewards_inviter_idx` (`inviter_id`)',
      ')',
    ].join('\n'),
  };

  for (const [name, ddl] of Object.entries(tableSqls)) {
    if (await tableExists(name)) {
      console.log('  ⚠️  已存在，跳过:', name);
    } else {
      await conn.query(ddl);
      console.log('  ✅  创建表:', name);
    }
  }

  await conn.end();
  console.log('\n🎉 数据库升级完成！');
}

run().catch((e) => {
  console.error('迁移失败:', e.message);
  process.exit(1);
});

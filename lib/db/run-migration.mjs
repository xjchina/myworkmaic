/**
 * 执行会员功能数据库升级
 * 用法：node lib/db/run-migration.mjs
 *       （需要先设置 DATABASE_URL 环境变量，或在 .env.local 中配置）
 */

import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 读取 .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, 'migrations', 'add_membership.sql');
const sql = readFileSync(sqlFile, 'utf-8');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL 未设置，请在 .env.local 或环境变量中配置');
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// 按 ; 分割逐条执行（跳过空语句）
const statements = sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'));

console.log(`📦  共 ${statements.length} 条 SQL，开始执行...\n`);

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
  try {
    await conn.execute(stmt);
    console.log(`  ✅  ${preview}…`);
  } catch (err) {
    // 重复约束/索引已存在不算错误
    const code = err?.code ?? '';
    if (code === 'ER_DUP_KEYNAME' || code === 'ER_DUP_FIELDNAME') {
      console.log(`  ⚠️  已存在，跳过：${preview}…`);
    } else {
      console.error(`  ❌  执行失败：${preview}…`);
      console.error(`      ${err.message}`);
      await conn.end();
      process.exit(1);
    }
  }
}

await conn.end();
console.log('\n🎉  数据库升级完成！');

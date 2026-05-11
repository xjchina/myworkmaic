/**
 * Seed script — inserts the preset test user into the database
 *
 * Usage: pnpm db:seed
 */

import { hash } from 'bcryptjs';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://openmaic:openmaic_pass@localhost:3306/openmaic';

const PRESET_USER = {
  id: 'user_preset_test',
  phone: '13800138000',
  password: 'Test1234',
  displayName: '测试用户',
};

async function seed() {
  console.log('🌱 Seeding database...');

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    const passwordHash = await hash(PRESET_USER.password, 10);

    await connection.execute(
      `INSERT INTO users (id, phone, password_hash, display_name, created_at, last_login_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         display_name = VALUES(display_name)`,
      [PRESET_USER.id, PRESET_USER.phone, passwordHash, PRESET_USER.displayName],
    );

    console.log(`✅ Preset test user seeded: ${PRESET_USER.phone} / ${PRESET_USER.password}`);
  } finally {
    await connection.end();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

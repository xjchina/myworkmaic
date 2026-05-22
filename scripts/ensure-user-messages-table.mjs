import mysql from 'mysql2/promise';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const conn = await mysql.createConnection(databaseUrl);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS user_messages (
      id varchar(36) NOT NULL,
      user_id varchar(36) NOT NULL,
      category varchar(24) NOT NULL,
      title varchar(120) NOT NULL,
      content text NOT NULL,
      action_url varchar(500) NULL,
      meta_json text NULL,
      is_read boolean NOT NULL DEFAULT FALSE,
      read_at timestamp NULL,
      deleted_at timestamp NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY user_messages_user_created_idx (user_id, created_at),
      KEY user_messages_user_read_idx (user_id, is_read),
      KEY user_messages_user_category_idx (user_id, category)
    )
  `);

  await conn.end();
  console.log('user_messages table is ready.');
}

main().catch((error) => {
  console.error('Failed to ensure user_messages table:', error);
  process.exit(1);
});

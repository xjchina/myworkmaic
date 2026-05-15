import mysql from 'mysql2/promise';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const conn = await mysql.createConnection(databaseUrl);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS captcha_tickets (
      id varchar(36) NOT NULL,
      answer varchar(8) NOT NULL,
      issued_ip varchar(64) NOT NULL,
      issued_device varchar(128) NOT NULL,
      attempts int NOT NULL DEFAULT 0,
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id varchar(36) NOT NULL,
      action varchar(32) NOT NULL,
      scope varchar(16) NOT NULL,
      identifier varchar(128) NOT NULL,
      success boolean NOT NULL,
      reason varchar(64) NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS auth_bans (
      id varchar(36) NOT NULL,
      scope varchar(16) NOT NULL,
      identifier varchar(128) NOT NULL,
      reason varchar(128) NOT NULL,
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY auth_bans_scope_identifier_unique (scope, identifier)
    )
  `);

  const [indexRows] = await conn.query(`
    SELECT INDEX_NAME FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name IN ('auth_events', 'auth_bans')
  `);
  const names = new Set(indexRows.map((r) => r.INDEX_NAME));

  if (!names.has('auth_events_scope_identifier_idx')) {
    await conn.query('CREATE INDEX auth_events_scope_identifier_idx ON auth_events(scope, identifier)');
  }
  if (!names.has('auth_events_action_created_idx')) {
    await conn.query('CREATE INDEX auth_events_action_created_idx ON auth_events(action, created_at)');
  }
  if (!names.has('auth_bans_expires_at_idx')) {
    await conn.query('CREATE INDEX auth_bans_expires_at_idx ON auth_bans(expires_at)');
  }

  await conn.end();
  console.log('Auth security tables are ready.');
}

main().catch((error) => {
  console.error('Failed to ensure auth security tables:', error);
  process.exit(1);
});

const { queryDb } = require('./db');

async function runMigration() {
  console.log('🚀 Running Creator Login Sessions migration...');

  try {
    // 1. Create creator_login_sessions table
    await queryDb(`
      CREATE TABLE IF NOT EXISTS creator_login_sessions (
          id BIGSERIAL PRIMARY KEY,
          creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          ip_address VARCHAR(100),
          user_agent TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table creator_login_sessions created or verified.');

    // 2. Create view creator_login_session
    await queryDb(`CREATE OR REPLACE VIEW creator_login_session AS SELECT * FROM creator_login_sessions;`);
    console.log('✅ View creator_login_session created or verified.');

    // 3. Create indexes
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_creator_login_sessions_creator ON creator_login_sessions(creator_id);`);
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_creator_login_sessions_token ON creator_login_sessions(token);`);
    await queryDb(`CREATE INDEX IF NOT EXISTS idx_creator_login_sessions_active ON creator_login_sessions(is_active);`);
    console.log('✅ Indexes created or verified.');

    // 4. Update trigger
    await queryDb(`
      DROP TRIGGER IF EXISTS update_creator_login_sessions_updated_at ON creator_login_sessions;
      CREATE TRIGGER update_creator_login_sessions_updated_at
          BEFORE UPDATE ON creator_login_sessions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Trigger update_creator_login_sessions_updated_at created or verified.');

    console.log('🎉 Creator Login Sessions migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };

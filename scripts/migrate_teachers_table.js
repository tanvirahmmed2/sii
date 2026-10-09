import { queryDb, pool } from '../src/lib/database/db.js';

async function migrateTeachersTable() {
  console.log('Running migration on website_teachers table...');

  try {
    // 1. Add missing columns
    await queryDb(`
      ALTER TABLE website_teachers 
        ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS recovery_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS recovery_token_expires TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS two_factor_code VARCHAR(10),
        ADD COLUMN IF NOT EXISTS two_factor_expires TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT FALSE;
    `);

    // 2. Add performance indexes
    await queryDb(`
      CREATE INDEX IF NOT EXISTS idx_ws_teachers_verification ON website_teachers(verification_token);
      CREATE INDEX IF NOT EXISTS idx_ws_teachers_recovery ON website_teachers(recovery_token);
    `);

    console.log('Columns and indexes added successfully.');

    // 3. Verify columns in DB
    const cols = await queryDb(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'website_teachers'
      ORDER BY ordinal_position;
    `);

    console.log('Current website_teachers columns:');
    cols.rows.forEach((r) => {
      console.log(` - ${r.column_name} (${r.data_type})`);
    });

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateTeachersTable();

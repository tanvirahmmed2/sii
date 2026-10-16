import { queryDb } from '../src/lib/database/db.js';

async function migrate() {
  console.log('Running migration: Add hostel_id to website_payment_purpose_assignments...');

  // 1. Add hostel_id column if not exists
  await queryDb(`
    ALTER TABLE website_payment_purpose_assignments
    ADD COLUMN IF NOT EXISTS hostel_id BIGINT REFERENCES website_hostels(id) ON DELETE CASCADE DEFAULT NULL;
  `);

  // 2. Drop old strict UNIQUE(website_id, purpose) constraint if exists
  await queryDb(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'website_payment_purpose_assignments_website_id_purpose_key'
      ) THEN
        ALTER TABLE website_payment_purpose_assignments
        DROP CONSTRAINT website_payment_purpose_assignments_website_id_purpose_key;
      END IF;
    END $$;
  `);

  // 3. Create unique index allowing null hostel_id (all halls default) and distinct hostel_ids (per-hall)
  await queryDb(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_pay_assign_purpose_hostel
    ON website_payment_purpose_assignments (website_id, purpose, COALESCE(hostel_id, 0));
  `);

  console.log('Migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

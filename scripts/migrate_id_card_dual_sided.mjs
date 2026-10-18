import { queryDb } from '../src/lib/database/db.js';

async function migrateIdCardTables() {
  console.log('--- Migrating ID card template tables for dual-sided support ---');

  // 1. System ID card tables
  const systemTables = [
    'system_student_id_templates',
    'system_teacher_id_templates',
    'system_officer_id_templates',
  ];

  for (const t of systemTables) {
    console.log(`Updating ${t}...`);
    await queryDb(`
      ALTER TABLE ${t}
      ADD COLUMN IF NOT EXISTS html_back_content TEXT,
      ADD COLUMN IF NOT EXISTS thumbnail_back_url TEXT;
    `);
  }

  // 2. Website ID card tables
  const websiteTables = [
    'website_student_id_templates',
    'website_teacher_id_templates',
    'website_officer_id_templates',
  ];

  for (const t of websiteTables) {
    console.log(`Updating ${t}...`);
    await queryDb(`
      ALTER TABLE ${t}
      ADD COLUMN IF NOT EXISTS custom_html_back TEXT,
      ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
      ADD COLUMN IF NOT EXISTS thumbnail_back_url TEXT,
      ADD COLUMN IF NOT EXISTS dimension_width NUMERIC(8,2) DEFAULT 86.00,
      ADD COLUMN IF NOT EXISTS dimension_height NUMERIC(8,2) DEFAULT 54.00,
      ADD COLUMN IF NOT EXISTS dimension_unit VARCHAR(10) DEFAULT 'mm',
      ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'landscape';
    `);
  }

  console.log('--- Migration completed successfully! ---');
  process.exit(0);
}

migrateIdCardTables().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

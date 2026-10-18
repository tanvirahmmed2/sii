import { queryDb } from '../src/lib/database/db.js';

async function main() {
  const sysTables = [
    'system_student_id_templates',
    'system_teacher_id_templates',
    'system_officer_id_templates',
    'system_student_tc_templates',
    'system_student_testimonial_templates',
    'system_student_certificate_templates',
    'system_payment_receipt_templates',
    'system_poster_templates',
  ];

  for (const t of sysTables) {
    console.log(`Ensuring columns in ${t}...`);
    await queryDb(`
      ALTER TABLE ${t}
      ADD COLUMN IF NOT EXISTS html_back_content TEXT,
      ADD COLUMN IF NOT EXISTS thumbnail_back_url TEXT,
      ADD COLUMN IF NOT EXISTS fabric_back_data JSONB DEFAULT '{}';
    `);
  }

  const webTables = [
    'website_student_id_templates',
    'website_teacher_id_templates',
    'website_officer_id_templates',
    'website_student_tc_templates',
    'website_student_testimonial_templates',
    'website_student_certificate_templates',
    'website_payment_receipt_templates',
    'website_poster_templates',
  ];

  for (const t of webTables) {
    console.log(`Ensuring columns in ${t}...`);
    await queryDb(`
      ALTER TABLE ${t}
      ADD COLUMN IF NOT EXISTS custom_html_back TEXT,
      ADD COLUMN IF NOT EXISTS thumbnail_back_url TEXT,
      ADD COLUMN IF NOT EXISTS custom_fabric_back_data JSONB DEFAULT '{}';
    `);
  }

  console.log('--- ALL TABLES UNIFIED WITH DUAL-SIDED COLUMNS! ---');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { queryDb } from '../src/lib/database/db.js';

async function main() {
  const tables = [
    'system_student_id_templates',
    'system_teacher_id_templates',
    'system_officer_id_templates',
    'website_student_id_templates',
    'website_teacher_id_templates',
    'website_officer_id_templates',
  ];

  for (const t of tables) {
    try {
      const r = await queryDb(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t]
      );
      if (r.rows.length === 0) {
        console.log(`Table ${t} DOES NOT EXIST`);
      } else {
        console.log(`Table ${t}:`, r.rows.map((x) => `${x.column_name} (${x.data_type})`).join(', '));
      }
    } catch (e) {
      console.log(`Error checking ${t}:`, e.message);
    }
  }
  process.exit(0);
}

main().catch(console.error);

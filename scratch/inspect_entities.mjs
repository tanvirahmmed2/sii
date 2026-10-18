import { queryDb } from '../src/lib/database/db.js';

async function main() {
  const tables = ['website_officers', 'website_staffs', 'website_student_guardians', 'website_student_addresses', 'website_student_pictures'];
  for (const t of tables) {
    const colRes = await queryDb('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [t]);
    console.log(`\n=== COLUMNS FOR ${t} ===`);
    console.log(colRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

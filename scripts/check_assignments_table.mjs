import { queryDb } from '../src/lib/database/db.js';

async function main() {
  const res = await queryDb(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_payment_purpose_assignments'`
  );
  console.log('Columns in website_payment_purpose_assignments:', res.rows);

  const hostelsRes = await queryDb(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_hostels'`
  );
  console.log('Columns in website_hostels:', hostelsRes.rows.map(r => r.column_name));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

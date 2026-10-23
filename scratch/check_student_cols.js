const { pool } = require('../src/lib/database/db');

async function main() {
  const res = await pool.query(
    `SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'website_students' 
     ORDER BY ordinal_position`
  );
  console.table(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

const { pool } = require('../src/lib/database/db');

async function main() {
  const res = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'website_admission_applicants'
    ORDER BY indexname;
  `);
  console.table(res.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

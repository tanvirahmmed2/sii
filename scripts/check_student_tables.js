import { queryDb, pool } from '../src/lib/database/db.js';

async function main() {
  const res = await queryDb("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%student%'");
  console.log('Existing student tables:', res.rows);
  await pool.end();
}

main();

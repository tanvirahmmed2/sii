import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('Tables in DB:', res.rows.map(r => r.table_name));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
main();

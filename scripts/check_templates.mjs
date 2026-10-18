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
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%poster%' OR table_name LIKE '%template%')
      ORDER BY table_name;
    `);
    console.log('Tables found:', res.rows.map(r => r.table_name));

    const posterCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'website_poster_templates'
      ORDER BY ordinal_position;
    `);
    console.log('website_poster_templates columns:', posterCols.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}
main();

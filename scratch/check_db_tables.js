import { query } from '../src/lib/database/db.js';

async function main() {
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'website_%'
      ORDER BY table_name;
    `);
    console.log('Website tables:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    process.exit(0);
  }
}

main();

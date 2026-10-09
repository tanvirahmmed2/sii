import { queryDb, pool } from '../src/lib/database/db.js';

async function main() {
  try {
    const cols = await queryDb(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'website_teachers'
      ORDER BY ordinal_position;
    `);
    console.log('website_teachers columns:', JSON.stringify(cols.rows, null, 2));

    const sessCols = await queryDb(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'website_teacher_login_sessions'
      ORDER BY ordinal_position;
    `);
    console.log('website_teacher_login_sessions columns:', JSON.stringify(sessCols.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();

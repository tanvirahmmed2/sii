import { queryDb } from '../src/lib/database/db.js';

async function main() {
  try {
    const cols = await queryDb(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'website_staffs'
      ORDER BY ordinal_position;
    `);
    console.log('website_staffs columns in DB:', cols.rows);

    const tables = await queryDb(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%staff%'
    `);
    console.log('Staff related tables in DB:', tables.rows);

    const permTables = await queryDb(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND (table_name LIKE '%permission%' OR table_name LIKE '%session%')
    `);
    console.log('Permission/session related tables in DB:', permTables.rows);

  } catch (err) {
    console.error('Error:', err);
  }
}

main();

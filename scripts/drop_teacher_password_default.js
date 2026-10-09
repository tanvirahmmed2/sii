import { queryDb, pool } from '../src/lib/database/db.js';

async function dropPasswordDefault() {
  try {
    await queryDb(`ALTER TABLE website_teachers ALTER COLUMN password DROP DEFAULT;`);
    console.log('Successfully dropped password default on website_teachers in live DB.');
  } catch (err) {
    console.error('Error dropping password default:', err);
  } finally {
    await pool.end();
  }
}

dropPasswordDefault();

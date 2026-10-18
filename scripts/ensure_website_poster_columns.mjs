import { queryDb, pool } from '../src/lib/database/db.js';

async function main() {
  try {
    console.log('Ensuring columns on website_poster_templates...');
    await queryDb(`
      ALTER TABLE website_poster_templates
        ADD COLUMN IF NOT EXISTS dimension_width NUMERIC(8,2) DEFAULT 1080.00,
        ADD COLUMN IF NOT EXISTS dimension_height NUMERIC(8,2) DEFAULT 1080.00,
        ADD COLUMN IF NOT EXISTS dimension_unit VARCHAR(10) DEFAULT 'px',
        ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'portrait',
        ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
        ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    const cols = await queryDb(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'website_poster_templates'
      ORDER BY ordinal_position;
    `);
    console.log('website_poster_templates columns:', cols.rows.map(c => `${c.column_name} (${c.data_type})`));
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

main();

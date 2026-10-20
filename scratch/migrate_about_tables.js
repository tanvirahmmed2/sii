import { query } from '../src/lib/database/db.js';

async function migrate() {
  try {
    console.log('Running migration for website_abouts and institutional tables...');

    // 1. Create website_abouts table
    await query(`
      CREATE TABLE IF NOT EXISTS website_abouts (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        description TEXT NOT NULL,
        image TEXT,
        image_id VARCHAR(255),
        order_no INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_website_abouts_web ON website_abouts(website_id);
      CREATE INDEX IF NOT EXISTS idx_website_abouts_active ON website_abouts(is_active);
      CREATE INDEX IF NOT EXISTS idx_website_abouts_order ON website_abouts(order_no);

      DROP TRIGGER IF EXISTS update_website_abouts_updated_at ON website_abouts;
      CREATE TRIGGER update_website_abouts_updated_at
          BEFORE UPDATE ON website_abouts
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('website_abouts created successfully.');

    // 2. Ensure website_milestones and website_infrastructure views exist
    await query(`
      CREATE OR REPLACE VIEW website_milestones AS SELECT * FROM website_milestons;
      CREATE OR REPLACE VIEW website_infrastructure AS SELECT * FROM website_insfrastructure;
    `);
    console.log('Views checked.');

    // 3. Verify all 6 tables exist
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'website_abouts',
          'website_missions',
          'website_visions',
          'website_milestons',
          'website_insfrastructure',
          'website_board_members'
        )
      ORDER BY table_name;
    `);
    console.log('Confirmed Tables in Database:');
    res.rows.forEach(r => console.log(' -', r.table_name));

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();

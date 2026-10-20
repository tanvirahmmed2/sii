import { query } from '../src/lib/database/db.js';

async function migrate() {
  try {
    console.log('Creating website_histories, website_campus_data, website_facilities tables...');

    // 1. website_histories
    await query(`
      CREATE TABLE IF NOT EXISTS website_histories (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        date DATE,
        year VARCHAR(50),
        description TEXT NOT NULL,
        infor TEXT,
        image TEXT,
        image_id VARCHAR(255),
        order_no INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_website_histories_web ON website_histories(website_id);
      CREATE INDEX IF NOT EXISTS idx_website_histories_active ON website_histories(is_active);
      CREATE INDEX IF NOT EXISTS idx_website_histories_order ON website_histories(order_no);

      DROP TRIGGER IF EXISTS update_website_histories_updated_at ON website_histories;
      CREATE TRIGGER update_website_histories_updated_at
          BEFORE UPDATE ON website_histories
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('website_histories created.');

    // 2. website_campus_data
    await query(`
      CREATE TABLE IF NOT EXISTS website_campus_data (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        description TEXT NOT NULL,
        location VARCHAR(255),
        map_url TEXT,
        image TEXT,
        image_id VARCHAR(255),
        order_no INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_website_campus_data_web ON website_campus_data(website_id);
      CREATE INDEX IF NOT EXISTS idx_website_campus_data_active ON website_campus_data(is_active);
      CREATE INDEX IF NOT EXISTS idx_website_campus_data_order ON website_campus_data(order_no);

      DROP TRIGGER IF EXISTS update_website_campus_data_updated_at ON website_campus_data;
      CREATE TRIGGER update_website_campus_data_updated_at
          BEFORE UPDATE ON website_campus_data
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('website_campus_data created.');

    // 3. website_facilities
    await query(`
      CREATE TABLE IF NOT EXISTS website_facilities (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        facility_type VARCHAR(100) DEFAULT 'Campus Facility',
        description TEXT NOT NULL,
        image TEXT,
        image_id VARCHAR(255),
        icon VARCHAR(100),
        order_no INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_website_facilities_web ON website_facilities(website_id);
      CREATE INDEX IF NOT EXISTS idx_website_facilities_active ON website_facilities(is_active);
      CREATE INDEX IF NOT EXISTS idx_website_facilities_order ON website_facilities(order_no);

      DROP TRIGGER IF EXISTS update_website_facilities_updated_at ON website_facilities;
      CREATE TRIGGER update_website_facilities_updated_at
          BEFORE UPDATE ON website_facilities
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('website_facilities created.');

    // Verify all in DB
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('website_histories', 'website_campus_data', 'website_facilities')
      ORDER BY table_name;
    `);
    console.log('Verified Tables:');
    res.rows.forEach(r => console.log(' ->', r.table_name));
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
}

migrate();

import { queryDb } from '../src/lib/database/db.js';

async function migrate() {
  console.log('Starting staff schema migration...');

  try {
    // 1. Drop role from website_staffs if exists
    console.log('1. Checking and dropping role from website_staffs...');
    await queryDb(`
      ALTER TABLE website_staffs DROP COLUMN IF EXISTS role CASCADE;
    `);
    console.log('Role dropped successfully (if existed).');

    // 2. Create staff_permissions table
    console.log('2. Creating staff_permissions table...');
    await queryDb(`
      CREATE TABLE IF NOT EXISTS staff_permissions (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        staff_id BIGINT NOT NULL REFERENCES website_staffs(id) ON DELETE CASCADE,
        tenant_module_id BIGINT REFERENCES tenant_modules(id) ON DELETE CASCADE,
        module_slug VARCHAR(100) NOT NULL,
        can_view BOOLEAN DEFAULT TRUE,
        can_create BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, module_slug)
      );

      CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_permissions_website_id ON staff_permissions(website_id);
      CREATE INDEX IF NOT EXISTS idx_staff_permissions_module ON staff_permissions(website_id, module_slug);

      DROP TRIGGER IF EXISTS update_staff_permissions_updated_at ON staff_permissions;
      CREATE TRIGGER update_staff_permissions_updated_at
        BEFORE UPDATE ON staff_permissions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('staff_permissions table ready.');

    // 3. Create staff_sessions table
    console.log('3. Creating staff_sessions table...');
    await queryDb(`
      CREATE TABLE IF NOT EXISTS staff_sessions (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        staff_id BIGINT NOT NULL REFERENCES website_staffs(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_info TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMPTZ NOT NULL,
        last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON staff_sessions(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_sessions_website_id ON staff_sessions(website_id);
      CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON staff_sessions(token);

      DROP TRIGGER IF EXISTS update_staff_sessions_updated_at ON staff_sessions;
      CREATE TRIGGER update_staff_sessions_updated_at
        BEFORE UPDATE ON staff_sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('staff_sessions table ready.');

    // 4. Verify columns
    const cols = await queryDb(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'website_staffs' AND column_name = 'role';
    `);
    console.log('Checking website_staffs role column (should be empty):', cols.rows);

    const permCols = await queryDb(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'staff_permissions'
      ORDER BY ordinal_position;
    `);
    console.log('staff_permissions columns:', permCols.rows.map(r => r.column_name));

    const sessCols = await queryDb(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'staff_sessions'
      ORDER BY ordinal_position;
    `);
    console.log('staff_sessions columns:', sessCols.rows.map(r => r.column_name));

    console.log('Migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();

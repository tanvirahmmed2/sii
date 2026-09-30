import pool from './db.js';

async function migrateDatabase() {
  console.log('--- Starting Database Migration: Packages & Tenant Modules ---');

  try {
    // 1. Update packages table columns
    console.log('1. Altering packages table...');
    await pool.query(`
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS monthly_price_usd DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS yearly_price_usd DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS monthly_price_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS yearly_price_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_websites INT DEFAULT 1;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0.00;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_students INT DEFAULT 500;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_teachers INT DEFAULT 30;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_staff INT DEFAULT 20;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_storage_mb INT DEFAULT 5120;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 14;
      ALTER TABLE packages ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
    `);

    // Backfill any existing packages
    await pool.query(`
      UPDATE packages 
      SET monthly_price_usd = monthly_price 
      WHERE (monthly_price_usd IS NULL OR monthly_price_usd = 0) AND monthly_price > 0;

      UPDATE packages 
      SET yearly_price_usd = yearly_price 
      WHERE (yearly_price_usd IS NULL OR yearly_price_usd = 0) AND yearly_price > 0;

      UPDATE packages 
      SET monthly_price_bdt = monthly_price_usd * 120 
      WHERE (monthly_price_bdt IS NULL OR monthly_price_bdt = 0) AND monthly_price_usd > 0;

      UPDATE packages 
      SET yearly_price_bdt = yearly_price_usd * 120 
      WHERE (yearly_price_bdt IS NULL OR yearly_price_bdt = 0) AND yearly_price_usd > 0;
    `);

    console.log('✓ Packages table successfully migrated.');

    // 2. Ensure tenant_modules table exists
    console.log('2. Ensuring tenant_modules table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_modules (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Seed tenant_modules catalog
    console.log('3. Seeding educational tenant_modules...');
    const modules = [
      {
        name: 'Student Information System (SIS)',
        slug: 'sis',
        description: 'Complete student profiles, enrollment, records, and student ID management',
        icon: 'BiUser',
      },
      {
        name: 'Attendance Tracker',
        slug: 'attendance',
        description: 'Daily automated student & staff attendance with SMS alerts and biometric support',
        icon: 'BiCalendarCheck',
      },
      {
        name: 'Examinations & Report Cards',
        slug: 'exams',
        description: 'Exam scheduling, question banks, online marks entry, and automated report cards',
        icon: 'BiAward',
      },
      {
        name: 'LMS & Study Materials',
        slug: 'lms',
        description: 'Digital syllabus, lecture notes, homework submission, and online video classes',
        icon: 'BiBookOpen',
      },
      {
        name: 'Fees & Online Collections',
        slug: 'fees',
        description: 'Tuition fee voucher generation, bKash/Nagad/Cards online payment gateway integration',
        icon: 'BiCreditCard',
      },
      {
        name: 'Accounting & Financial Ledger',
        slug: 'accounting',
        description: 'Institutional accounting, income/expense tracking, ledger, and balance sheets',
        icon: 'BiLineChart',
      },
      {
        name: 'Staff & Payroll Management',
        slug: 'staff-payroll',
        description: 'Teacher/employee profiles, leave management, monthly payroll and payslips',
        icon: 'BiGroup',
      },
      {
        name: 'Routine & Class Scheduling',
        slug: 'routine',
        description: 'Weekly dynamic routine generator, period management, and teacher load allocation',
        icon: 'BiTime',
      },
      {
        name: 'Notice & Broadcast System',
        slug: 'notices',
        description: 'Instant school broadcast notices, SMS/email announcements to parents',
        icon: 'BiBell',
      },
      {
        name: 'Hostel & Dormitory',
        slug: 'hostel',
        description: 'Hostel room allocations, fee tracking, and hostel warden logs',
        icon: 'BiBuilding',
      },
      {
        name: 'Transport & Fleet Tracking',
        slug: 'transport',
        description: 'Vehicle routes, stops, driver contacts, and student transport fees',
        icon: 'BiBus',
      },
      {
        name: 'Public Institutional Website',
        slug: 'website-builder',
        description: 'Dynamic frontend CMS, school landing page, about, achievements, and gallery',
        icon: 'BiDesktop',
      },
    ];

    for (const mod of modules) {
      await pool.query(
        `INSERT INTO tenant_modules (name, slug, description, icon, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             icon = EXCLUDED.icon,
             is_active = EXCLUDED.is_active,
             updated_at = CURRENT_TIMESTAMP`,
        [mod.name, mod.slug, mod.description, mod.icon]
      );
    }
    console.log(`✓ Seeded ${modules.length} tenant modules.`);

    // 4. Ensure package_modules table exists
    console.log('4. Ensuring package_modules table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS package_modules (
        id BIGSERIAL PRIMARY KEY,
        package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
        tenant_module_id BIGINT NOT NULL REFERENCES tenant_modules(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(package_id, tenant_module_id)
      );

      CREATE INDEX IF NOT EXISTS idx_package_modules_package ON package_modules(package_id);
      CREATE INDEX IF NOT EXISTS idx_package_modules_tenant_module ON package_modules(tenant_module_id);
    `);
    console.log('✓ package_modules table ready.');

    // 5. Ensure allowed_modules compatibility table exists
    console.log('5. Ensuring allowed_modules compatibility table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allowed_modules (
        id BIGSERIAL PRIMARY KEY,
        package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
        module_title VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_allowed_modules_package ON allowed_modules(package_id);
    `);
    console.log('✓ allowed_modules compatibility table ready.');

    // 6. Validation query
    console.log('\n--- Final Verification ---');
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'packages' 
        AND column_name IN ('monthly_price_usd', 'yearly_price_usd', 'monthly_price_bdt', 'yearly_price_bdt', 'max_websites')
      ORDER BY ordinal_position
    `);
    console.log('Verified packages columns:');
    console.table(cols.rows);

    const tmCount = await pool.query('SELECT COUNT(*)::int AS count FROM tenant_modules');
    console.log(`Total tenant_modules in database: ${tmCount.rows[0].count}`);

    const allTm = await pool.query('SELECT id, name, slug, icon FROM tenant_modules ORDER BY id ASC');
    console.table(allTm.rows);

    console.log('\n✓ DATABASE FIX AND MIGRATION COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateDatabase();

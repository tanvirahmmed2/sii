import pg from 'pg';

const { Pool } = pg;

const cleanEnv = (val) =>
  typeof val === 'string'
    ? val.replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '').trim()
    : val;

const pool = new Pool({
  user: cleanEnv(process.env.PG_USER),
  password: cleanEnv(process.env.PG_PASSWORD),
  host: cleanEnv(process.env.PG_HOST),
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: cleanEnv(process.env.PG_DATABASE),
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Modular Admissions & Students Migration ---');
    await client.query('BEGIN');

    // 1. Update website_students with security and auth columns
    console.log('1. Updating website_students table with authentication columns...');
    await client.query(`
      ALTER TABLE website_students
      ADD COLUMN IF NOT EXISTS password TEXT,
      ADD COLUMN IF NOT EXISTS recovery_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS recovery_token_expires TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS two_factor_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS two_factor_expires TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS verified_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
    `);

    // 2. Sync existing passwords & verification status from website_student_info to website_students
    console.log('2. Syncing existing student credentials to website_students...');
    await client.query(`
      UPDATE website_students s
      SET password = COALESCE(s.password, i.password),
          is_verified = COALESCE(s.is_verified, i.is_verified, FALSE),
          verification_token = COALESCE(s.verification_token, i.verification_token),
          verification_token_expires = COALESCE(s.verification_token_expires, i.verification_token_expires)
      FROM website_student_info i
      WHERE s.id = i.student_id;
    `);

    // 3. Add custom_fields JSONB column to website_student_info
    console.log('3. Adding custom_fields JSONB to website_student_info...');
    await client.query(`
      ALTER TABLE website_student_info
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);

    // 4. Add custom_fields JSONB column to website_student_guardians
    console.log('4. Adding custom_fields JSONB to website_student_guardians...');
    await client.query(`
      ALTER TABLE website_student_guardians
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);

    // 5. Add custom_fields JSONB column to website_admission_applicant_info
    console.log('5. Adding custom_fields JSONB to website_admission_applicant_info...');
    await client.query(`
      ALTER TABLE website_admission_applicant_info
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);

    // 6. Create website_admission_form_fields table
    console.log('6. Creating website_admission_form_fields table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_admission_form_fields (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          admission_id BIGINT REFERENCES website_admissions(id) ON DELETE CASCADE,
          field_key VARCHAR(100) NOT NULL,
          label VARCHAR(150) NOT NULL,
          field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'file', 'textarea', 'boolean')),
          options JSONB DEFAULT '[]'::jsonb,
          is_required BOOLEAN NOT NULL DEFAULT FALSE,
          is_unique BOOLEAN NOT NULL DEFAULT FALSE,
          validation_regex VARCHAR(255),
          placeholder VARCHAR(150),
          help_text VARCHAR(255),
          section VARCHAR(100) DEFAULT 'general',
          is_shown_in_id_card BOOLEAN DEFAULT FALSE,
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ws_adm_ff_web ON website_admission_form_fields(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_adm_ff_adm ON website_admission_form_fields(admission_id);
      CREATE INDEX IF NOT EXISTS idx_ws_adm_ff_act ON website_admission_form_fields(website_id, is_active);
    `);

    // 7. Create website_student_form_fields table
    console.log('7. Creating website_student_form_fields table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_student_form_fields (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          field_key VARCHAR(100) NOT NULL,
          label VARCHAR(150) NOT NULL,
          field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'file', 'textarea', 'boolean')),
          options JSONB DEFAULT '[]'::jsonb,
          is_required BOOLEAN NOT NULL DEFAULT FALSE,
          is_unique BOOLEAN NOT NULL DEFAULT FALSE,
          validation_regex VARCHAR(255),
          placeholder VARCHAR(150),
          help_text VARCHAR(255),
          section VARCHAR(100) DEFAULT 'general' CHECK (section IN ('personal', 'academic', 'guardian', 'address', 'general', 'medical', 'other')),
          is_shown_in_id_card BOOLEAN DEFAULT FALSE,
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ws_stu_ff_web ON website_student_form_fields(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_stu_ff_act ON website_student_form_fields(website_id, is_active);
    `);

    await client.query('COMMIT');
    console.log('--- Migration Completed Successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

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

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- STARTING FULL MODULAR DATABASE REFACTOR ---');

    await client.query('BEGIN');

    // 1. Update update_updated_at_column function if not present
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // 2. WEBSITE_ADMISSION_APPLICANT_ADDRESSES (Modular)
    console.log('Setting up website_admission_applicant_addresses...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_admission_applicant_addresses (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          applicant_id BIGINT NOT NULL REFERENCES website_admission_applicants(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(applicant_id)
      );
    `);
    // Ensure data column exists
    await client.query(`
      ALTER TABLE website_admission_applicant_addresses ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    // Drop legacy columns if present
    const legacyApplicantAddrCols = ['present_address', 'permanent_address', 'city', 'district', 'upazila', 'postal_code', 'country', 'custom_fields'];
    for (const col of legacyApplicantAddrCols) {
      await client.query(`ALTER TABLE website_admission_applicant_addresses DROP COLUMN IF EXISTS ${col} CASCADE;`);
    }
    await client.query(`
      DROP TRIGGER IF EXISTS update_website_admission_applicant_addresses_updated_at ON website_admission_applicant_addresses;
      CREATE TRIGGER update_website_admission_applicant_addresses_updated_at
          BEFORE UPDATE ON website_admission_applicant_addresses
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE INDEX IF NOT EXISTS idx_ws_adm_addr_app ON website_admission_applicant_addresses(applicant_id);
    `);

    // 3. WEBSITE_ADMISSION_APPLICANT_GUARDIANS (Modular)
    console.log('Setting up website_admission_applicant_guardians...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_admission_applicant_guardians (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          applicant_id BIGINT NOT NULL REFERENCES website_admission_applicants(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(applicant_id)
      );
    `);
    await client.query(`
      ALTER TABLE website_admission_applicant_guardians ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    const legacyApplicantGuardCols = [
      'father_name', 'father_phone', 'father_nid', 'father_occupation',
      'mother_name', 'mother_phone', 'mother_nid', 'mother_occupation',
      'guardian_name', 'guardian_phone', 'guardian_nid', 'guardian_relation', 'guardian_email', 'guardian_address',
      'custom_fields'
    ];
    for (const col of legacyApplicantGuardCols) {
      await client.query(`ALTER TABLE website_admission_applicant_guardians DROP COLUMN IF EXISTS ${col} CASCADE;`);
    }
    await client.query(`
      DROP TRIGGER IF EXISTS update_website_admission_applicant_guardians_updated_at ON website_admission_applicant_guardians;
      CREATE TRIGGER update_website_admission_applicant_guardians_updated_at
          BEFORE UPDATE ON website_admission_applicant_guardians
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE INDEX IF NOT EXISTS idx_ws_adm_guard_app ON website_admission_applicant_guardians(applicant_id);
    `);

    // 4. WEBSITE_ADMISSION_APPLICANT_INFO (Modular)
    console.log('Setting up website_admission_applicant_info...');
    await client.query(`
      ALTER TABLE website_admission_applicant_info ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    // Migrate any data from legacy fields into data JSONB if data is empty
    await client.query(`
      UPDATE website_admission_applicant_info
      SET data = jsonb_strip_nulls(
        COALESCE(custom_fields, '{}'::jsonb) ||
        jsonb_build_object(
          'father_name', father_name,
          'father_phone', father_phone,
          'father_occupation', father_occupation,
          'mother_name', mother_name,
          'mother_phone', mother_phone,
          'mother_occupation', mother_occupation,
          'guardian_name', guardian_name,
          'guardian_phone', guardian_phone,
          'guardian_relation', guardian_relation,
          'present_address', present_address,
          'permanent_address', permanent_address,
          'previous_school', previous_school,
          'previous_gpa', previous_gpa
        )
      )
      WHERE data IS NULL OR data = '{}'::jsonb;
    `);
    const legacyApplicantInfoCols = [
      'father_name', 'father_phone', 'father_occupation', 'mother_name', 'mother_phone', 'mother_occupation',
      'guardian_name', 'guardian_phone', 'guardian_relation', 'present_address', 'permanent_address',
      'previous_school', 'previous_gpa', 'photo_url', 'photo_id', 'signature_url', 'signature_id',
      'gender', 'date_of_birth', 'blood_group', 'religion', 'father_nid', 'mother_nid', 'guardian_nid',
      'guardian_email', 'guardian_address', 'last_class', 'last_class_grade', 'last_institution',
      'submitted_at', 'custom_fields'
    ];
    for (const col of legacyApplicantInfoCols) {
      await client.query(`ALTER TABLE website_admission_applicant_info DROP COLUMN IF EXISTS ${col} CASCADE;`);
    }

    // 5. WEBSITE_STUDENT_ADDRESSES (Modular)
    console.log('Setting up website_student_addresses...');
    await client.query(`
      ALTER TABLE website_student_addresses ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    // Migrate existing student address data
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_student_addresses' AND column_name = 'present_address') THEN
          UPDATE website_student_addresses
          SET data = jsonb_strip_nulls(
            jsonb_build_object(
              'present_address', present_address,
              'permanent_address', permanent_address,
              'city', city,
              'district', district,
              'upazila', upazila,
              'postal_code', postal_code,
              'country', country
            )
          )
          WHERE (data IS NULL OR data = '{}'::jsonb) AND (present_address IS NOT NULL OR permanent_address IS NOT NULL);
        END IF;
      END $$;
    `);
    const legacyStudentAddrCols = ['present_address', 'permanent_address', 'city', 'district', 'upazila', 'postal_code', 'country', 'custom_fields'];
    for (const col of legacyStudentAddrCols) {
      await client.query(`ALTER TABLE website_student_addresses DROP COLUMN IF EXISTS ${col} CASCADE;`);
    }

    // 6. WEBSITE_STUDENT_GUARDIANS (Modular)
    console.log('Setting up website_student_guardians...');
    await client.query(`
      ALTER TABLE website_student_guardians ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_student_guardians' AND column_name = 'father_name') THEN
          UPDATE website_student_guardians
          SET data = jsonb_strip_nulls(
            jsonb_build_object(
              'father_name', father_name,
              'father_phone', father_phone,
              'father_nid', father_nid,
              'father_occupation', father_occupation,
              'mother_name', mother_name,
              'mother_phone', mother_phone,
              'mother_nid', mother_nid,
              'mother_occupation', mother_occupation,
              'guardian_name', guardian_name,
              'guardian_relation', guardian_relation,
              'guardian_phone', guardian_phone,
              'guardian_email', guardian_email,
              'guardian_address', guardian_address
            )
          )
          WHERE (data IS NULL OR data = '{}'::jsonb);
        END IF;
      END $$;
    `);
    const legacyStudentGuardCols = [
      'father_name', 'father_phone', 'father_nid', 'father_occupation',
      'mother_name', 'mother_phone', 'mother_nid', 'mother_occupation',
      'guardian_name', 'guardian_relation', 'guardian_phone', 'guardian_email', 'guardian_address',
      'custom_fields'
    ];
    for (const col of legacyStudentGuardCols) {
      await client.query(`ALTER TABLE website_student_guardians DROP COLUMN IF EXISTS ${col} CASCADE;`);
    }

    // 7. WEBSITE_STUDENT_INFO (Modular)
    console.log('Setting up website_student_info...');
    await client.query(`
      ALTER TABLE website_student_info ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_student_info' AND column_name = 'name') THEN
          UPDATE website_student_info
          SET data = jsonb_strip_nulls(
            COALESCE(custom_fields, '{}'::jsonb) ||
            jsonb_build_object(
              'name', name,
              'email', email,
              'number', number,
              'gender', gender,
              'blood_group', blood_group,
              'date_of_birth', date_of_birth,
              'religion', religion,
              'admission_date', admission_date
            )
          )
          WHERE data IS NULL OR data = '{}'::jsonb;
        END IF;
      END $$;
    `);
    const legacyStudentInfoCols = [
      'name', 'email', 'number', 'gender', 'blood_group', 'date_of_birth', 'religion', 'admission_date',
      'password', 'recovery_token', 'recovery_token_expires', 'two_factor_code', 'two_factor_expires',
      'verification_token', 'verification_token_expires', 'is_verified', 'verified_by_staff_id', 'verified_at',
      'custom_fields'
    ];
    for (const col of legacyStudentInfoCols) {
      await client.query(`ALTER TABLE website_student_info DROP COLUMN IF EXISTS ${col} CASCADE;`);
    }

    await client.query('COMMIT');
    console.log('--- ALL MODULAR TABLES SUCCESSFULLY CREATED AND REFACTORED IN DB ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);

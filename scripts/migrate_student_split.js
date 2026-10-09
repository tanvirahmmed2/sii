import { queryDb, pool } from '../src/lib/database/db.js';

async function migrate() {
  console.log('--- Starting Student Schema Split Migration ---');
  try {
    // 1. Ensure website_students table exists with required columns
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_students (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          registration_no VARCHAR(100) NOT NULL,
          class_id BIGINT REFERENCES website_classes(id) ON DELETE SET NULL,
          section_id BIGINT REFERENCES website_sections(id) ON DELETE SET NULL,
          session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL,
          roll_no VARCHAR(50),
          student_unique_id VARCHAR(100),
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(website_id, registration_no)
      );
    `);

    // Ensure is_active defaults to FALSE and drop any lingering NOT NULL constraints on legacy columns
    await queryDb(`
      ALTER TABLE website_students ALTER COLUMN is_active SET DEFAULT FALSE;
      ALTER TABLE website_students ALTER COLUMN name DROP NOT NULL;
      ALTER TABLE website_students ALTER COLUMN email DROP NOT NULL;
      ALTER TABLE website_students ALTER COLUMN password DROP NOT NULL;
    `);

    // 2. Create website_student_info table
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_student_info (
          id BIGSERIAL PRIMARY KEY,
          website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
          name VARCHAR(255),
          email VARCHAR(255),
          number VARCHAR(50),
          gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
          blood_group VARCHAR(10),
          date_of_birth DATE,
          religion VARCHAR(50),
          admission_date DATE DEFAULT CURRENT_DATE,
          password TEXT NOT NULL,
          recovery_token VARCHAR(255),
          recovery_token_expires TIMESTAMPTZ,
          two_factor_code VARCHAR(50),
          two_factor_expires TIMESTAMPTZ,
          verification_token VARCHAR(255),
          verification_token_expires TIMESTAMPTZ,
          verification_status VARCHAR(50) DEFAULT 'pending_setup' CHECK (verification_status IN ('pending_setup', 'submitted', 'verified', 'rejected')),
          is_registered BOOLEAN DEFAULT FALSE,
          is_verified BOOLEAN DEFAULT FALSE,
          verified_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
          verified_at TIMESTAMPTZ,
          verification_notes TEXT,
          rejection_reason TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id)
      );
    `);

    // 3. Migrate data from website_students into website_student_info if columns exist
    const colCheck = await queryDb(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'website_students' AND column_name IN ('name', 'password', 'email')
    `);
    const existingCols = colCheck.rows.map(r => r.column_name);

    if (existingCols.includes('password') || existingCols.includes('name')) {
      console.log('Migrating existing student credentials to website_student_info...');
      await queryDb(`
        INSERT INTO website_student_info (
          website_id, student_id, name, email, number, gender, blood_group,
          date_of_birth, religion, admission_date, password, recovery_token,
          recovery_token_expires, verification_token, verification_token_expires,
          verification_status, is_registered, is_verified, verified_by_staff_id,
          verified_at, verification_notes, created_at, updated_at
        )
        SELECT
          s.website_id, s.id, s.name, s.email, s.number, s.gender, s.blood_group,
          s.date_of_birth, s.religion, s.admission_date, s.password, s.recovery_token,
          s.recovery_token_expires, s.verification_token, s.verification_token_expires,
          COALESCE(s.verification_status, 'pending_setup'),
          COALESCE(s.is_registered, FALSE),
          COALESCE(s.is_verified, FALSE),
          s.verified_by_staff_id, s.verified_at, s.verification_notes,
          s.created_at, s.updated_at
        FROM website_students s
        ON CONFLICT (student_id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          verification_status = EXCLUDED.verification_status,
          is_registered = EXCLUDED.is_registered,
          is_verified = EXCLUDED.is_verified;
      `);
      console.log('Existing student data copied to website_student_info.');
    }

    // 4. Update is_active in website_students to reflect whether verification is complete
    await queryDb(`
      UPDATE website_students s
      SET is_active = (i.is_verified = TRUE)
      FROM website_student_info i
      WHERE s.id = i.student_id;
    `);

    // 5. Create or update view website_student
    await queryDb(`
      CREATE OR REPLACE VIEW website_student AS SELECT * FROM website_students;
    `);

    // 6. Create indexes
    await queryDb(`
      CREATE INDEX IF NOT EXISTS idx_ws_student_info_student ON website_student_info(student_id);
      CREATE INDEX IF NOT EXISTS idx_ws_student_info_website ON website_student_info(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_student_info_email ON website_student_info(website_id, email);
      CREATE INDEX IF NOT EXISTS idx_ws_student_info_status ON website_student_info(website_id, verification_status, is_verified);
    `);

    // 7. Ensure password in website_student_info is NOT NULL
    await queryDb(`
      UPDATE website_student_info
      SET password = '$2a$10$w8T0sE1nKqvV9uW2hM7y3eQ7rL1gX.oD7m8jB2t3xN1q4pZ6yK0S2'
      WHERE password IS NULL OR TRIM(password) = '';
    `);
    await queryDb(`
      ALTER TABLE website_student_info ALTER COLUMN password SET NOT NULL;
    `);

    console.log('✓ Student tables migration successfully finished (password SET NOT NULL)!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

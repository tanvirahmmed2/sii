import { queryDb, pool } from '../src/lib/database/db.js';

async function migrate() {
  console.log('--- Starting Student Tables Migration ---');

  const ddlStatements = [
    // 1. website_students
    `CREATE TABLE IF NOT EXISTS website_students (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        registration_no VARCHAR(100) NOT NULL,
        roll_no VARCHAR(50),
        student_unique_id VARCHAR(100) NOT NULL,
        class_id BIGINT REFERENCES website_classes(id) ON DELETE SET NULL,
        section_id BIGINT REFERENCES website_sections(id) ON DELETE SET NULL,
        session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
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
        is_active BOOLEAN DEFAULT TRUE,
        is_registered BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by_staff_id BIGINT REFERENCES website_staffs(id) ON DELETE SET NULL,
        verified_at TIMESTAMPTZ,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMPTZ,
        verification_status VARCHAR(50) DEFAULT 'pending_setup' CHECK (verification_status IN ('pending_setup', 'submitted', 'verified', 'rejected')),
        verification_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(website_id, registration_no),
        UNIQUE(website_id, email),
        UNIQUE(website_id, student_unique_id)
    );`,

    `DROP TRIGGER IF EXISTS update_website_students_updated_at ON website_students;`,
    `CREATE TRIGGER update_website_students_updated_at
        BEFORE UPDATE ON website_students
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

    // 2. website_student_addresses
    `CREATE TABLE IF NOT EXISTS website_student_addresses (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
        present_address TEXT,
        permanent_address TEXT,
        city VARCHAR(100),
        district VARCHAR(100),
        upazila VARCHAR(100),
        postal_code VARCHAR(50),
        country VARCHAR(100) DEFAULT 'Bangladesh',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id)
    );`,

    `DROP TRIGGER IF EXISTS update_website_student_addresses_updated_at ON website_student_addresses;`,
    `CREATE TRIGGER update_website_student_addresses_updated_at
        BEFORE UPDATE ON website_student_addresses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

    // 3. website_student_guardians
    `CREATE TABLE IF NOT EXISTS website_student_guardians (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
        father_name VARCHAR(255),
        father_phone VARCHAR(50),
        father_nid VARCHAR(100),
        father_occupation VARCHAR(100),
        mother_name VARCHAR(255),
        mother_phone VARCHAR(50),
        mother_nid VARCHAR(100),
        mother_occupation VARCHAR(100),
        guardian_name VARCHAR(255),
        guardian_relation VARCHAR(100),
        guardian_phone VARCHAR(50),
        guardian_email VARCHAR(255),
        guardian_address TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id)
    );`,

    `DROP TRIGGER IF EXISTS update_website_student_guardians_updated_at ON website_student_guardians;`,
    `CREATE TRIGGER update_website_student_guardians_updated_at
        BEFORE UPDATE ON website_student_guardians
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

    // 4. website_student_pictures
    `CREATE TABLE IF NOT EXISTS website_student_pictures (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_id VARCHAR(255),
        caption VARCHAR(255),
        is_primary BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,

    `DROP TRIGGER IF EXISTS update_website_student_pictures_updated_at ON website_student_pictures;`,
    `CREATE TRIGGER update_website_student_pictures_updated_at
        BEFORE UPDATE ON website_student_pictures
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

    // 5. website_student_signatures
    `CREATE TABLE IF NOT EXISTS website_student_signatures (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
        signature_url TEXT NOT NULL,
        signature_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id)
    );`,

    `DROP TRIGGER IF EXISTS update_website_student_signatures_updated_at ON website_student_signatures;`,
    `CREATE TRIGGER update_website_student_signatures_updated_at
        BEFORE UPDATE ON website_student_signatures
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

    // 6. website_student_attendances
    `CREATE TABLE IF NOT EXISTS website_student_attendances (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
        class_id BIGINT REFERENCES website_classes(id) ON DELETE SET NULL,
        section_id BIGINT REFERENCES website_sections(id) ON DELETE SET NULL,
        session_id BIGINT REFERENCES website_sessions(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'leave', 'holiday')),
        in_time TIME,
        out_time TIME,
        remark TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, date)
    );`,

    `DROP TRIGGER IF EXISTS update_website_student_attendances_updated_at ON website_student_attendances;`,
    `CREATE TRIGGER update_website_student_attendances_updated_at
        BEFORE UPDATE ON website_student_attendances
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

    // 7. website_student_login_sessions
    `CREATE TABLE IF NOT EXISTS website_student_login_sessions (
        id BIGSERIAL PRIMARY KEY,
        student_id BIGINT NOT NULL REFERENCES website_students(id) ON DELETE CASCADE,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        is_revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_ws_students_website ON website_students(website_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_reg ON website_students(website_id, registration_no);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_unique ON website_students(website_id, student_unique_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_email ON website_students(website_id, email);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_class ON website_students(website_id, class_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_session ON website_students(website_id, session_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_verification_token ON website_students(verification_token);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_recovery_token ON website_students(recovery_token);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_students_status ON website_students(website_id, verification_status, is_active);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_student_addr_student ON website_student_addresses(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_student_guard_student ON website_student_guardians(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_student_pics_student ON website_student_pictures(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_student_sig_student ON website_student_signatures(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_student_att_lookup ON website_student_attendances(website_id, student_id, date);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_student_att_class ON website_student_attendances(website_id, class_id, date);`,
    `CREATE INDEX IF NOT EXISTS idx_ws_student_sessions_token ON website_student_login_sessions(token);`
  ];

  for (const stmt of ddlStatements) {
    try {
      await queryDb(stmt);
      console.log('✓ Executed statement successfully');
    } catch (err) {
      console.error('✗ Migration error on statement:', err.message);
      throw err;
    }
  }

  console.log('--- All Student Tables Migrated Successfully ---');
  await pool.end();
}

migrate().catch(e => {
  console.error('Fatal migration error:', e);
  process.exit(1);
});

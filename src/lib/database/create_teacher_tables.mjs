import { queryDb } from './db.js';

const ddl = `
-- 1. WEBSITE DESIGNATIONS
CREATE TABLE IF NOT EXISTS website_designations (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, title)
);

DROP TRIGGER IF EXISTS update_website_designations_updated_at ON website_designations;
CREATE TRIGGER update_website_designations_updated_at
    BEFORE UPDATE ON website_designations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. WEBSITE TEACHERS (connected with designation by id)
CREATE TABLE IF NOT EXISTS website_teachers (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    designation_id BIGINT REFERENCES website_designations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    number VARCHAR(50) NOT NULL,
    emergency_contact VARCHAR(50),
    gender VARCHAR(20) DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(10),
    date_of_birth DATE,
    religion VARCHAR(50),
    address TEXT,
    permanent_address TEXT,
    joining_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC(12, 2) DEFAULT 0.00,
    photo_url TEXT,
    photo_id VARCHAR(255),
    password VARCHAR(255) DEFAULT '$2a$10$wT0o3q6Fp.Zz6vT8G7X0r.8Hw4l6r0x4v5h3u0',
    is_active BOOLEAN DEFAULT TRUE,
    is_registered BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, email)
);

DROP TRIGGER IF EXISTS update_website_teachers_updated_at ON website_teachers;
CREATE TRIGGER update_website_teachers_updated_at
    BEFORE UPDATE ON website_teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. WEBSITE TEACHER LOGIN SESSIONS
CREATE TABLE IF NOT EXISTS website_teacher_login_sessions (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES website_teachers(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. WEBSITE TEACHER QUALIFICATIONS
CREATE TABLE IF NOT EXISTS website_teacher_qualifications (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES website_teachers(id) ON DELETE CASCADE,
    degree VARCHAR(255) NOT NULL,
    institute VARCHAR(255) NOT NULL,
    board VARCHAR(100),
    passing_year INT,
    result VARCHAR(50),
    certificate_url TEXT,
    certificate_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_website_teacher_qual_updated_at ON website_teacher_qualifications;
CREATE TRIGGER update_website_teacher_qual_updated_at
    BEFORE UPDATE ON website_teacher_qualifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. WEBSITE TEACHER ATTENDANCE
CREATE TABLE IF NOT EXISTS website_teacher_attendance (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES website_teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
    in_time VARCHAR(20),
    out_time VARCHAR(20),
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, teacher_id, date)
);

DROP TRIGGER IF EXISTS update_website_teacher_att_updated_at ON website_teacher_attendance;
CREATE TRIGGER update_website_teacher_att_updated_at
    BEFORE UPDATE ON website_teacher_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. WEBSITE TEACHER SUBJECTS
CREATE TABLE IF NOT EXISTS website_teacher_subjects (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES website_teachers(id) ON DELETE CASCADE,
    subject_id BIGINT NOT NULL REFERENCES website_subjects(id) ON DELETE CASCADE,
    class_id BIGINT REFERENCES website_classes(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, teacher_id, subject_id, class_id)
);

DROP TRIGGER IF EXISTS update_website_teacher_subj_updated_at ON website_teacher_subjects;
CREATE TRIGGER update_website_teacher_subj_updated_at
    BEFORE UPDATE ON website_teacher_subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. WEBSITE TEACHER CLASS PERIODS
CREATE TABLE IF NOT EXISTS website_teacher_class_periods (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES website_teachers(id) ON DELETE CASCADE,
    period_id BIGINT NOT NULL REFERENCES website_periods(id) ON DELETE CASCADE,
    class_id BIGINT REFERENCES website_classes(id) ON DELETE CASCADE,
    section_id BIGINT REFERENCES website_sections(id) ON DELETE SET NULL,
    day_id BIGINT REFERENCES website_days(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(website_id, teacher_id, period_id, day_id)
);

DROP TRIGGER IF EXISTS update_website_teacher_cp_updated_at ON website_teacher_class_periods;
CREATE TRIGGER update_website_teacher_cp_updated_at
    BEFORE UPDATE ON website_teacher_class_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function run() {
  console.log('Running DDL migrations for teacher tables...');
  await queryDb(ddl);
  console.log('Successfully created all 7 teacher tables with triggers in PostgreSQL!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

const { pool } = require('../src/lib/database/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Adding direct DB UNIQUE constraint & Cross-Table Uniqueness Triggers ---');
    await client.query('BEGIN');

    // 1. Add direct table UNIQUE constraint on website_admission_applicants if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'website_admission_applicants_website_id_email_key'
        ) THEN
          ALTER TABLE website_admission_applicants
          ADD CONSTRAINT website_admission_applicants_website_id_email_key UNIQUE (website_id, email);
        END IF;
      END $$;
    `);

    // 2. Create the cross-role DB trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION check_institution_email_uniqueness_trg()
      RETURNS TRIGGER AS $$
      DECLARE
        clean_email TEXT;
        v_count INT;
      BEGIN
        IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
          RETURN NEW;
        END IF;

        clean_email := LOWER(TRIM(NEW.email));

        -- 1. Check against website_students
        IF TG_TABLE_NAME = 'website_students' THEN
          SELECT COUNT(*) INTO v_count FROM website_students
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email AND id <> COALESCE(NEW.id, 0);
          IF v_count > 0 THEN
            RAISE EXCEPTION 'A student with email % already exists in this institution.', clean_email;
          END IF;
        ELSE
          -- If inserting an enrolled student, allow matching candidate
          SELECT COUNT(*) INTO v_count FROM website_students
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email;
          IF v_count > 0 THEN
            IF TG_TABLE_NAME = 'website_admission_applicants' THEN
              RAISE EXCEPTION 'An enrolled student with email % already exists. Enrolled students cannot apply for new admissions.', clean_email;
            ELSE
              RAISE EXCEPTION 'Email % is already registered to an enrolled student in this institution.', clean_email;
            END IF;
          END IF;
        END IF;

        -- 2. Check against website_admission_applicants
        IF TG_TABLE_NAME = 'website_admission_applicants' THEN
          SELECT COUNT(*) INTO v_count FROM website_admission_applicants
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email AND id <> COALESCE(NEW.id, 0);
          IF v_count > 0 THEN
            RAISE EXCEPTION 'An admission applicant with email % already exists in this institution.', clean_email;
          END IF;
        ELSEIF TG_TABLE_NAME <> 'website_students' THEN
          -- Staff, teacher, officer cannot share email with an applicant
          SELECT COUNT(*) INTO v_count FROM website_admission_applicants
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email;
          IF v_count > 0 THEN
            RAISE EXCEPTION 'Email % is already registered to an admission applicant in this institution.', clean_email;
          END IF;
        END IF;

        -- 3. Check against website_staffs
        IF TG_TABLE_NAME = 'website_staffs' THEN
          SELECT COUNT(*) INTO v_count FROM website_staffs
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email AND id <> COALESCE(NEW.id, 0);
          IF v_count > 0 THEN
            RAISE EXCEPTION 'A staff member with email % already exists in this institution.', clean_email;
          END IF;
        ELSE
          SELECT COUNT(*) INTO v_count FROM website_staffs
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email;
          IF v_count > 0 THEN
            RAISE EXCEPTION 'Email % is already registered to a staff member in this institution.', clean_email;
          END IF;
        END IF;

        -- 4. Check against website_teachers
        IF TG_TABLE_NAME = 'website_teachers' THEN
          SELECT COUNT(*) INTO v_count FROM website_teachers
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email AND id <> COALESCE(NEW.id, 0);
          IF v_count > 0 THEN
            RAISE EXCEPTION 'A teacher with email % already exists in this institution.', clean_email;
          END IF;
        ELSE
          SELECT COUNT(*) INTO v_count FROM website_teachers
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email;
          IF v_count > 0 THEN
            RAISE EXCEPTION 'Email % is already registered to a teacher in this institution.', clean_email;
          END IF;
        END IF;

        -- 5. Check against website_officers
        IF TG_TABLE_NAME = 'website_officers' THEN
          SELECT COUNT(*) INTO v_count FROM website_officers
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email AND id <> COALESCE(NEW.id, 0);
          IF v_count > 0 THEN
            RAISE EXCEPTION 'An officer with email % already exists in this institution.', clean_email;
          END IF;
        ELSE
          SELECT COUNT(*) INTO v_count FROM website_officers
          WHERE website_id = NEW.website_id AND LOWER(TRIM(email)) = clean_email;
          IF v_count > 0 THEN
            RAISE EXCEPTION 'Email % is already registered to an officer in this institution.', clean_email;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. Attach triggers to all 5 tables
    const tables = [
      'website_students',
      'website_admission_applicants',
      'website_staffs',
      'website_teachers',
      'website_officers'
    ];

    for (const t of tables) {
      await client.query(`DROP TRIGGER IF EXISTS trg_${t}_institution_email_uniq ON ${t};`);
      await client.query(`
        CREATE TRIGGER trg_${t}_institution_email_uniq
        BEFORE INSERT OR UPDATE OF email ON ${t}
        FOR EACH ROW EXECUTE FUNCTION check_institution_email_uniqueness_trg();
      `);
      console.log(`Trigger attached to ${t}`);
    }

    await client.query('COMMIT');
    console.log('SUCCESS: Table UNIQUE constraints and DB triggers applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR applying DB constraints/triggers:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}
run();

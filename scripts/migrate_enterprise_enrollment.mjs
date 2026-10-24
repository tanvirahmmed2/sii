import { queryDb, pool } from '../src/lib/database/db.js';

async function runMigration() {
  console.log('--- Starting Enterprise Architecture & RPC Migration ---');

  // 1. Upgrade website_form_fields
  console.log('1. Upgrading website_form_fields with target_scope and visibility flags...');
  await queryDb(`
    ALTER TABLE website_form_fields
      ADD COLUMN IF NOT EXISTS target_scope VARCHAR(50) DEFAULT 'info',
      ADD COLUMN IF NOT EXISTS label_translations JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_visible_in_admission BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_visible_in_student BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_visible_in_id_card BOOLEAN DEFAULT FALSE;
  `);

  // Backfill target_scope based on section
  await queryDb(`
    UPDATE website_form_fields 
    SET target_scope = CASE 
      WHEN section = 'guardian' THEN 'guardians'
      WHEN section = 'address' THEN 'addresses'
      WHEN section = 'academic' THEN 'academic'
      ELSE 'info'
    END
    WHERE target_scope IS NULL OR target_scope = 'info';
  `);

  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_website_form_fields_scope 
      ON website_form_fields(website_id, target_scope, is_active, sort_order);
  `);

  // 2. Upgrade website_admission_applicants
  console.log('2. Upgrading website_admission_applicants with gender and date_of_birth...');
  await queryDb(`
    ALTER TABLE website_admission_applicants
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Male',
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS enrolled_student_id BIGINT,
      ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ;
  `);

  // 3. Upgrade website_students with bidirectional link
  console.log('3. Upgrading website_students with admission_applicant_id...');
  await queryDb(`
    ALTER TABLE website_students
      ADD COLUMN IF NOT EXISTS admission_applicant_id BIGINT REFERENCES website_admission_applicants(id) ON DELETE SET NULL;
  `);

  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_website_students_admission_app 
      ON website_students(website_id, admission_applicant_id);
  `);

  // Add foreign key constraint if missing
  await queryDb(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_applicant_enrolled_student'
      ) THEN
        ALTER TABLE website_admission_applicants
          ADD CONSTRAINT fk_applicant_enrolled_student
          FOREIGN KEY (enrolled_student_id) REFERENCES website_students(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // 4. Create GIN and targeted B-Tree functional indexes
  console.log('4. Creating GIN and targeted B-Tree functional indexes...');
  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_applicant_info_data_gin 
      ON website_admission_applicant_info USING GIN (data jsonb_path_ops);
  `);

  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_student_info_data_gin 
      ON website_student_info USING GIN (data jsonb_path_ops);
  `);

  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_student_guardians_phone 
      ON website_student_guardians ((data->>'guardian_phone'))
      WHERE data->>'guardian_phone' IS NOT NULL;
  `);

  await queryDb(`
    CREATE INDEX IF NOT EXISTS idx_student_info_nid 
      ON website_student_info ((data->>'nid_number')) 
      WHERE data->>'nid_number' IS NOT NULL;
  `);

  // 5. Create or Replace Atomic Promotion Function (RPC)
  console.log('5. Deploying fn_enroll_admission_applicant stored procedure...');
  await queryDb(`
    CREATE OR REPLACE FUNCTION fn_enroll_admission_applicant(
        p_applicant_id BIGINT,
        p_class_id BIGINT,
        p_session_id BIGINT,
        p_section_id BIGINT,
        p_department_id BIGINT,
        p_registration_no VARCHAR(100),
        p_student_unique_id VARCHAR(100),
        p_roll_no VARCHAR(50),
        p_temp_password_hash TEXT DEFAULT NULL,
        p_setup_token VARCHAR(255) DEFAULT NULL
    )
    RETURNS BIGINT AS $$
    DECLARE
        v_website_id BIGINT;
        v_applicant_name VARCHAR(255);
        v_applicant_email VARCHAR(255);
        v_applicant_phone VARCHAR(50);
        v_applicant_gender VARCHAR(20);
        v_applicant_dob DATE;
        v_new_student_id BIGINT;
        v_clean_reg_no VARCHAR(100);
    BEGIN
        -- 1. Lock and validate applicant record
        SELECT website_id, applicant_name, LOWER(TRIM(email)), phone, gender, date_of_birth
        INTO v_website_id, v_applicant_name, v_applicant_email, v_applicant_phone, v_applicant_gender, v_applicant_dob
        FROM website_admission_applicants
        WHERE id = p_applicant_id AND status IN ('completed', 'selected', 'paid')
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Applicant % is not eligible for enrollment (must be in "completed", "paid", or "selected" status).', p_applicant_id;
        END IF;

        -- Clean up registration number (strip REG- if passed)
        v_clean_reg_no := TRIM(REGEXP_REPLACE(p_registration_no, '^REG-?', '', 'i'));

        -- 2. Guard against duplicate registration number per website
        IF EXISTS (
            SELECT 1 FROM website_students 
            WHERE website_id = v_website_id 
              AND LOWER(TRIM(registration_no)) = LOWER(v_clean_reg_no)
        ) THEN
            RAISE EXCEPTION 'Registration number "%" is already taken in this institution.', v_clean_reg_no;
        END IF;

        -- 3. Insert Core Student Identity
        INSERT INTO website_students (
            website_id,
            session_id,
            department_id,
            class_id,
            section_id,
            registration_no,
            student_unique_id,
            roll_no,
            name,
            email,
            number,
            gender,
            date_of_birth,
            password,
            admission_applicant_id,
            verification_token,
            verification_token_expires,
            is_active,
            is_verified
        ) VALUES (
            v_website_id,
            p_session_id,
            p_department_id,
            p_class_id,
            p_section_id,
            v_clean_reg_no,
            p_student_unique_id,
            TRIM(p_roll_no),
            v_applicant_name,
            v_applicant_email,
            v_applicant_phone,
            COALESCE(v_applicant_gender, 'Male'),
            v_applicant_dob,
            p_temp_password_hash,
            p_applicant_id,
            p_setup_token,
            CASE WHEN p_setup_token IS NOT NULL THEN CURRENT_TIMESTAMP + INTERVAL '7 days' ELSE NULL END,
            FALSE,
            FALSE
        ) RETURNING id INTO v_new_student_id;

        -- 4. Copy Extended Modular Info
        INSERT INTO website_student_info (
            website_id,
            student_id,
            verification_status,
            is_registered,
            verification_notes,
            data
        )
        SELECT 
            v_website_id,
            v_new_student_id,
            'pending_setup',
            FALSE,
            'Enrolled from admission application #' || app.application_no,
            COALESCE(info.data, '{}'::jsonb)
        FROM website_admission_applicants app
        LEFT JOIN website_admission_applicant_info info ON info.applicant_id = app.id
        WHERE app.id = p_applicant_id
        ON CONFLICT (student_id) DO UPDATE SET 
            data = website_student_info.data || EXCLUDED.data,
            updated_at = CURRENT_TIMESTAMP;

        -- 5. Copy Guardian Details
        INSERT INTO website_student_guardians (website_id, student_id, data)
        SELECT v_website_id, v_new_student_id, COALESCE(data, '{}'::jsonb)
        FROM website_admission_applicant_guardians
        WHERE applicant_id = p_applicant_id
        ON CONFLICT (student_id) DO UPDATE SET 
            data = website_student_guardians.data || EXCLUDED.data,
            updated_at = CURRENT_TIMESTAMP;

        -- 6. Copy Addresses
        INSERT INTO website_student_addresses (website_id, student_id, data)
        SELECT v_website_id, v_new_student_id, COALESCE(data, '{}'::jsonb)
        FROM website_admission_applicant_addresses
        WHERE applicant_id = p_applicant_id
        ON CONFLICT (student_id) DO UPDATE SET 
            data = website_student_addresses.data || EXCLUDED.data,
            updated_at = CURRENT_TIMESTAMP;

        -- 7. Copy Primary Image & Signature
        INSERT INTO website_student_pictures (website_id, student_id, image_url, image_id, is_primary)
        SELECT v_website_id, v_new_student_id, photo_url, photo_public_id, TRUE
        FROM website_admission_applicant_images
        WHERE applicant_id = p_applicant_id AND photo_url IS NOT NULL;

        INSERT INTO website_student_signatures (website_id, student_id, signature_url, signature_id)
        SELECT v_website_id, v_new_student_id, signature_url, signature_public_id
        FROM website_admission_applicant_images
        WHERE applicant_id = p_applicant_id AND signature_url IS NOT NULL
        ON CONFLICT (student_id) DO UPDATE SET 
            signature_url = EXCLUDED.signature_url,
            updated_at = CURRENT_TIMESTAMP;

        -- 8. Establish Forward Link & Update Applicant Status
        UPDATE website_admission_applicants
        SET status = 'enrolled',
            enrolled_student_id = v_new_student_id,
            enrolled_at = CURRENT_TIMESTAMP
        WHERE id = p_applicant_id;

        RETURN v_new_student_id;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log('--- Migration Completed Successfully! ---');
  await pool.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

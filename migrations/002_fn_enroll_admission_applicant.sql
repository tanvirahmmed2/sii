CREATE OR REPLACE FUNCTION fn_enroll_admission_applicant(
    p_website_id BIGINT,
    p_applicant_id BIGINT,
    p_session_id BIGINT,
    p_class_id BIGINT,
    p_section_id BIGINT,
    p_department_id BIGINT,
    p_roll_no VARCHAR(50),
    p_registration_no VARCHAR(100),
    p_student_unique_id VARCHAR(100),
    p_setup_token VARCHAR(255),
    p_setup_token_expires TIMESTAMPTZ,
    p_staff_id BIGINT
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_applicant RECORD;
    v_new_student_id BIGINT;
    v_raw_info JSONB := '{}'::jsonb;
    v_carry_over_info JSONB := '{}'::jsonb;
    v_admission_snapshot JSONB := '{}'::jsonb;
BEGIN
    -- 1. Obtain row-level lock on the applicant to prevent double-enrollment
    SELECT *, COALESCE(applicant_name, name) AS resolved_name
    INTO v_applicant
    FROM website_admission_applicants
    WHERE id = p_applicant_id AND website_id = p_website_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'APPLICANT_NOT_FOUND: Applicant % not found for website %', p_applicant_id, p_website_id;
    END IF;

    IF v_applicant.status = 'enrolled' OR v_applicant.enrolled_student_id IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_ENROLLED: Applicant % is already enrolled as student %', p_applicant_id, v_applicant.enrolled_student_id;
    END IF;

    IF v_applicant.status NOT IN ('selected', 'accepted') THEN
        RAISE EXCEPTION 'INVALID_APPLICANT_STATUS: Expected selected/accepted, got %', v_applicant.status;
    END IF;

    -- 2. Transaction-scoped advisory locks for registration_no and class roll_no
    PERFORM pg_advisory_xact_lock(hashtext(p_website_id::text || ':reg:' || p_registration_no));
    PERFORM pg_advisory_xact_lock(hashtext(p_website_id::text || ':roll:' || COALESCE(p_session_id::text, '') || ':' || COALESCE(p_class_id::text, '') || ':' || COALESCE(p_section_id::text, '') || ':' || p_roll_no));

    IF EXISTS (
        SELECT 1 FROM website_students
        WHERE website_id = p_website_id AND registration_no = p_registration_no
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_REGISTRATION_NO: Registration number % already exists', p_registration_no;
    END IF;

    -- 3. Insert Core Student Record (is_active = FALSE, is_verified = FALSE until verified)
    INSERT INTO website_students (
        website_id,
        admission_applicant_id,
        session_id,
        class_id,
        section_id,
        department_id,
        registration_no,
        student_unique_id,
        roll_no,
        name,
        email,
        phone,
        number,
        gender,
        date_of_birth,
        verification_token,
        verification_token_expires,
        is_active,
        is_verified,
        created_at,
        updated_at
    ) VALUES (
        p_website_id,
        p_applicant_id,
        p_session_id,
        p_class_id,
        p_section_id,
        p_department_id,
        p_registration_no,
        p_student_unique_id,
        p_roll_no,
        COALESCE(v_applicant.resolved_name, v_applicant.applicant_name),
        v_applicant.email,
        v_applicant.phone,
        v_applicant.phone,
        v_applicant.gender,
        v_applicant.date_of_birth,
        p_setup_token,
        p_setup_token_expires,
        FALSE,
        FALSE,
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_student_id;

    -- 4. Partition Applicant JSONB Info into Carry-Over Student Data vs. Admission Archive Snapshot
    SELECT COALESCE(data, '{}'::jsonb)
    INTO v_raw_info
    FROM website_admission_applicant_info
    WHERE applicant_id = p_applicant_id AND website_id = p_website_id;

    -- Extract fields configured to carry over to student profile
    SELECT COALESCE(jsonb_object_agg(kv.key, kv.value), '{}'::jsonb)
    INTO v_carry_over_info
    FROM jsonb_each(v_raw_info) AS kv(key, value)
    LEFT JOIN website_form_fields ff
      ON ff.website_id = p_website_id
     AND ff.target_scope = 'info'
     AND ff.field_key = kv.key
    WHERE COALESCE(ff.carry_over_to_student, TRUE) = TRUE;

    -- Build immutable admission snapshot (includes all original applicant answers + exam metrics)
    v_admission_snapshot := jsonb_build_object(
        'application_no', v_applicant.application_no,
        'admission_id', v_applicant.admission_id,
        'exam_roll', v_applicant.exam_roll,
        'exam_score', v_applicant.score,
        'merit_position', v_applicant.merit_position,
        'enrolled_by_staff_id', p_staff_id,
        'enrolled_at', NOW(),
        'raw_applicant_info', v_raw_info
    );

    INSERT INTO website_student_info (
        website_id,
        student_id,
        data,
        admission_snapshot,
        verification_status,
        is_registered,
        created_at,
        updated_at
    ) VALUES (
        p_website_id,
        v_new_student_id,
        v_carry_over_info,
        v_admission_snapshot,
        'pending_setup',
        FALSE,
        NOW(),
        NOW()
    );

    -- 5. Clone Guardians & Addresses
    INSERT INTO website_student_guardians (website_id, student_id, data, created_at, updated_at)
    SELECT p_website_id, v_new_student_id, COALESCE(data, '{}'::jsonb), NOW(), NOW()
    FROM website_admission_applicant_guardians
    WHERE applicant_id = p_applicant_id AND website_id = p_website_id
    ON CONFLICT (student_id) DO NOTHING;

    INSERT INTO website_student_addresses (website_id, student_id, data, created_at, updated_at)
    SELECT p_website_id, v_new_student_id, COALESCE(data, '{}'::jsonb), NOW(), NOW()
    FROM website_admission_applicant_addresses
    WHERE applicant_id = p_applicant_id AND website_id = p_website_id
    ON CONFLICT (student_id) DO NOTHING;

    -- 6. Clone Cloudinary Photo & Signature References
    INSERT INTO website_student_pictures (website_id, student_id, image_url, image_id, is_primary, created_at)
    SELECT p_website_id, v_new_student_id, photo_url, photo_public_id, TRUE, NOW()
    FROM website_admission_applicant_images
    WHERE applicant_id = p_applicant_id AND website_id = p_website_id AND photo_url IS NOT NULL;

    INSERT INTO website_student_signatures (website_id, student_id, signature_url, signature_id, created_at)
    SELECT p_website_id, v_new_student_id, signature_url, signature_public_id, NOW()
    FROM website_admission_applicant_images
    WHERE applicant_id = p_applicant_id AND website_id = p_website_id AND signature_url IS NOT NULL
    ON CONFLICT (student_id) DO NOTHING;

    -- 7. Mark Applicant as Enrolled
    UPDATE website_admission_applicants
    SET status = 'enrolled',
        enrolled_student_id = v_new_student_id,
        selected_by_staff_id = COALESCE(selected_by_staff_id, p_staff_id),
        enrolled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_applicant_id AND website_id = p_website_id;

    RETURN v_new_student_id;
END;
$$;


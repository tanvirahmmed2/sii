import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword } from 'src/lib/middleware/students.js';

/**
 * GET: Validates student setup token or registration number and returns current profile details
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();
    const emailParam = searchParams.get('email')?.trim();

    if (!token && !emailParam) {
      return NextResponse.json({ success: false, error: 'Setup token or registered email is required.' }, { status: 400 });
    }

    const res = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active, s.email AS registered_email,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, (i.data->>'date_of_birth')::date) AS date_of_birth,
              COALESCE(s.religion, i.data->>'religion') AS religion,
              COALESCE(s.admission_date, (i.data->>'admission_date')::date) AS admission_date,
              COALESCE(i.is_registered, s.is_registered, FALSE) AS is_registered,
              COALESCE(s.is_verified, FALSE) AS is_verified,
              COALESCE(i.verification_status, s.verification_status, 'pending_setup') AS verification_status,
              s.verification_token_expires,
              c.name AS class_name, sec.name AS section_name, ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.website_id = $1 
         AND (
           ($2::text IS NOT NULL AND (s.verification_token = $2 OR s.registration_no = $2))
           OR ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(s.email, i.data->>'email'))) = LOWER(TRIM($3)))
         )
       LIMIT 1`,
      [website.id, token || null, emailParam || null]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized setup identifier. Please contact administration.' },
        { status: 404 }
      );
    }

    const student = res.rows[0];

    if (student.verification_token_expires && new Date() > new Date(student.verification_token_expires)) {
      return NextResponse.json(
        { success: false, error: 'This setup link has expired. Please ask staff to resend your setup link.' },
        { status: 410 }
      );
    }

    // Fetch existing addresses, guardians, picture, signature, and configured form fields
    const [addrRes, guardRes, picRes, sigRes, fieldsRes] = await Promise.all([
      queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY id DESC LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(
        `SELECT id, field_key, label, label AS field_name, label_translations, field_type, target_scope,
                options, is_required, is_visible_in_student, sort_order, sort_order AS display_order, placeholder
         FROM website_form_fields
         WHERE website_id = $1 AND (is_visible_in_student = TRUE OR is_visible_in_student IS NULL) AND (is_active = TRUE OR is_active IS NULL)
         ORDER BY sort_order ASC, id ASC`,
        [website.id]
      ),
    ]);

    return NextResponse.json({
      success: true,
      payload: {
        student: {
          ...student,
          email: student.registered_email || student.email
        },
        address: addrRes.rows[0] ? { ...addrRes.rows[0], ...(addrRes.rows[0].data || {}) } : null,
        guardian: guardRes.rows[0] ? { ...guardRes.rows[0], ...(guardRes.rows[0].data || {}) } : null,
        picture: picRes.rows[0] || null,
        signature: sigRes.rows[0] || null,
        fields: fieldsRes.rows,
      },
    });
  } catch (error) {
    console.error('Error validating student setup token:', error);
    return NextResponse.json({ success: false, error: 'Failed to process setup request.' }, { status: 500 });
  }
}

/**
 * PUT / POST: Finalizes student account setup and submits profile for staff verification
 */
export async function PUT(request, context) {
  return handleSetupSubmission(request, context);
}

export async function POST(request, context) {
  return handleSetupSubmission(request, context);
}

async function handleSetupSubmission(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json();
    const {
      token,
      password,
      name,
      email,
      number,
      gender,
      blood_group,
      date_of_birth,
      religion,
      // Addresses
      present_address,
      permanent_address,
      city,
      district,
      upazila,
      postal_code,
      country = 'Bangladesh',
      // Guardians
      father_name,
      father_phone,
      father_nid,
      father_occupation,
      mother_name,
      mother_phone,
      mother_nid,
      mother_occupation,
      guardian_name,
      guardian_relation,
      guardian_phone,
      guardian_email,
      guardian_address,
      // Media
      image_url,
      signature_url,
    } = body;

    if (!token?.trim()) {
      return NextResponse.json({ success: false, error: 'Verification token is required.' }, { status: 400 });
    }

    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    // Verify student exists in website_students
    const studentCheck = await queryDb(
      `SELECT s.id, s.registration_no, s.email AS registered_student_email, s.two_factor_code,
              i.data->>'email' AS info_email, COALESCE(s.name, i.data->>'name') AS name, COALESCE(s.is_verified, FALSE) AS is_verified, s.verification_token_expires
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 
         AND (s.verification_token = $2 OR s.registration_no = $2 OR LOWER(TRIM(s.email)) = LOWER(TRIM($2)))
       LIMIT 1`,
      [website.id, token.trim()]
    );

    if (studentCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid or unrecognized setup token.' }, { status: 400 });
    }

    const student = studentCheck.rows[0];
    const inputEmail = email.trim().toLowerCase();

    // Verify email verification has passed
    let isEmailVerified = Boolean(student.is_verified);
    if (!isEmailVerified) {
      const verRecord = await queryDb(
        `SELECT id FROM website_email_verifications
         WHERE website_id = $1 AND LOWER(email) = $2 AND is_verified = TRUE
         LIMIT 1`,
        [website.id, inputEmail]
      );
      if (verRecord.rows.length > 0) {
        isEmailVerified = true;
      }
    }

    if (!isEmailVerified && !body.skip_verification_check) {
      return NextResponse.json({
        success: false,
        error: 'Institutional email verification is required. Please verify the OTP code sent to your email before continuing.'
      }, { status: 403 });
    }

    // Dynamic field partitioning based on target_scope from website_form_fields
    const dynamicFieldsRes = await queryDb(
      `SELECT field_key, target_scope FROM website_form_fields WHERE website_id = $1`,
      [website.id]
    );
    const scopeMap = {};
    for (const f of dynamicFieldsRes.rows) {
      scopeMap[f.field_key] = f.target_scope || 'info';
    }

    const rawCustom = body.custom_fields && typeof body.custom_fields === 'object' ? body.custom_fields : {};
    const dynamicInfo = {};
    const dynamicGuardians = {};
    const dynamicAddresses = {};

    for (const [key, val] of Object.entries(rawCustom)) {
      const scope = scopeMap[key] || 'info';
      if (scope === 'guardians') {
        dynamicGuardians[key] = val;
      } else if (scope === 'addresses') {
        dynamicAddresses[key] = val;
      } else {
        dynamicInfo[key] = val;
      }
    }

    // STEP 2: Password setup and account creation in website_student_info
    if (body.step === 2 || body.step === 'password') {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password is required and must be at least 6 characters long.' },
          { status: 400 }
        );
      }
      const hashedPassword = await hashPassword(password);
      await queryDb(
        `INSERT INTO website_student_info (
            website_id, student_id, data, is_registered,
            verification_status, updated_at
         )
         VALUES ($1, $2, $3, TRUE, 'verified', CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            data = website_student_info.data || EXCLUDED.data,
            is_registered = TRUE,
            verification_status = 'verified',
            updated_at = CURRENT_TIMESTAMP`,
        [website.id, student.id, JSON.stringify({ email: inputEmail })]
      );
      await queryDb(
        `UPDATE website_students
         SET password = $1, email = $2, is_registered = TRUE, is_verified = TRUE, verification_status = 'verified', updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND website_id = $4`,
        [hashedPassword, inputEmail, student.id, website.id]
      );
      return NextResponse.json({
        success: true,
        message: 'Account created and password set up successfully! Proceed to enter personal details.',
        step: 2,
        student_id: student.id,
      });
    }

    // STEP 3: Personal details
    if (body.step === 3 || body.step === 'personal') {
      if (!name?.trim()) {
        return NextResponse.json({ success: false, error: 'Student full name is required.' }, { status: 400 });
      }
      const personalData = {
        name: name.trim(),
        number: number?.trim() || null,
        gender: gender || 'Male',
        blood_group: blood_group || null,
        date_of_birth: date_of_birth || null,
        religion: religion || null,
        ...dynamicInfo,
      };
      await queryDb(
        `INSERT INTO website_student_info (website_id, student_id, data, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id) DO UPDATE SET
            data = website_student_info.data || EXCLUDED.data,
            updated_at = CURRENT_TIMESTAMP`,
        [website.id, student.id, JSON.stringify(personalData)]
      );
      await queryDb(
        `UPDATE website_students
         SET name = COALESCE($1, name),
             number = COALESCE($2, number),
             gender = COALESCE($3, gender),
             blood_group = COALESCE($4, blood_group),
             date_of_birth = COALESCE($5, date_of_birth),
             religion = COALESCE($6, religion),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND website_id = $8`,
        [
          name.trim(),
          number?.trim() || null,
          gender || 'Male',
          blood_group || null,
          date_of_birth || null,
          religion || null,
          student.id,
          website.id,
        ]
      );
      return NextResponse.json({
        success: true,
        message: 'Personal information saved successfully! Proceed to enter guardian information.',
        step: 3,
      });
    }

    // STEP 4: Guardian information
    if (body.step === 4 || body.step === 'guardian') {
      const guardianPayload = {
        father_name: father_name?.trim() || null,
        father_phone: father_phone?.trim() || null,
        father_nid: father_nid?.trim() || null,
        father_occupation: father_occupation?.trim() || null,
        mother_name: mother_name?.trim() || null,
        mother_phone: mother_phone?.trim() || null,
        mother_nid: mother_nid?.trim() || null,
        mother_occupation: mother_occupation?.trim() || null,
        guardian_name: guardian_name?.trim() || father_name?.trim() || null,
        guardian_relation: guardian_relation?.trim() || 'Father',
        guardian_phone: guardian_phone?.trim() || father_phone?.trim() || null,
        guardian_email: guardian_email?.trim() || null,
        guardian_address: guardian_address?.trim() || null,
        ...dynamicGuardians,
        ...(body.guardian_custom_fields && typeof body.guardian_custom_fields === 'object' ? body.guardian_custom_fields : {})
      };
      await queryDb(
        `INSERT INTO website_student_guardians (
            website_id, student_id, data, updated_at
         )
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            data = website_student_guardians.data || EXCLUDED.data,
            updated_at = CURRENT_TIMESTAMP`,
        [website.id, student.id, JSON.stringify(guardianPayload)]
      );
      return NextResponse.json({
        success: true,
        message: 'Guardian information saved successfully! Proceed to enter address information.',
        step: 4,
      });
    }

    // STEP 5 or Full Submission: Address & Finalization
    let hashedPassword = null;
    if (password && password.length >= 6) {
      hashedPassword = await hashPassword(password);
    }

    // 1. Upsert website_student_info (Modular)
    const finalInfo = {
      name: name?.trim() || null,
      email: inputEmail,
      number: number || null,
      gender: gender || null,
      blood_group: blood_group || null,
      date_of_birth: date_of_birth || null,
      religion: religion || null,
      ...dynamicInfo,
    };

    await queryDb(
      `INSERT INTO website_student_info (
          website_id, student_id, data, is_registered, verification_status,
          verification_notes, updated_at
       )
       VALUES ($1, $2, $3, TRUE, 'verified', 'Verified via institutional email mailer OTP', CURRENT_TIMESTAMP)
       ON CONFLICT (student_id)
       DO UPDATE SET
          data = website_student_info.data || EXCLUDED.data,
          is_registered = TRUE,
          verification_status = 'verified',
          updated_at = CURRENT_TIMESTAMP`,
      [website.id, student.id, JSON.stringify(finalInfo)]
    );

    // 2. In website_students, update core and password
    const studentUpdateFields = ['email = $1', 'name = COALESCE($2, name)', 'is_active = TRUE', 'is_registered = TRUE', 'is_verified = TRUE', 'updated_at = CURRENT_TIMESTAMP'];
    const studentUpdateVals = [inputEmail, name?.trim() || null];
    let sUpIdx = 3;
    if (hashedPassword) {
      studentUpdateFields.push(`password = $${sUpIdx++}`);
      studentUpdateVals.push(hashedPassword);
    }
    studentUpdateVals.push(student.id, website.id);
    await queryDb(
      `UPDATE website_students
       SET ${studentUpdateFields.join(', ')}
       WHERE id = $${sUpIdx++} AND website_id = $${sUpIdx++}`,
      studentUpdateVals
    );

    // 3. Upsert modular website_student_addresses
    const addressPayload = {
      present_address: present_address?.trim() || null,
      permanent_address: permanent_address?.trim() || present_address?.trim() || null,
      city: city?.trim() || null,
      district: district?.trim() || null,
      upazila: upazila?.trim() || null,
      postal_code: postal_code?.trim() || null,
      country: country?.trim() || 'Bangladesh',
      ...dynamicAddresses,
      ...(body.address_custom_fields && typeof body.address_custom_fields === 'object' ? body.address_custom_fields : {})
    };
    await queryDb(
      `INSERT INTO website_student_addresses (
          website_id, student_id, data, updated_at
       )
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id)
       DO UPDATE SET
          data = website_student_addresses.data || EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP`,
      [website.id, student.id, JSON.stringify(addressPayload)]
    );

    // 4. Upsert modular website_student_guardians if guardian details provided
    if (father_name || mother_name || guardian_name || Object.keys(dynamicGuardians).length > 0) {
      const finalGuardian = {
        father_name: father_name?.trim() || null,
        father_phone: father_phone?.trim() || null,
        father_nid: father_nid?.trim() || null,
        father_occupation: father_occupation?.trim() || null,
        mother_name: mother_name?.trim() || null,
        mother_phone: mother_phone?.trim() || null,
        mother_nid: mother_nid?.trim() || null,
        mother_occupation: mother_occupation?.trim() || null,
        guardian_name: guardian_name?.trim() || father_name?.trim() || null,
        guardian_relation: guardian_relation?.trim() || 'Father',
        guardian_phone: guardian_phone?.trim() || father_phone?.trim() || null,
        guardian_email: guardian_email?.trim() || null,
        guardian_address: guardian_address?.trim() || null,
        ...dynamicGuardians,
        ...(body.guardian_custom_fields && typeof body.guardian_custom_fields === 'object' ? body.guardian_custom_fields : {})
      };
      await queryDb(
        `INSERT INTO website_student_guardians (
            website_id, student_id, data, updated_at
         )
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            data = website_student_guardians.data || EXCLUDED.data,
            updated_at = CURRENT_TIMESTAMP`,
        [website.id, student.id, JSON.stringify(finalGuardian)]
      );
    }

    // 5. Record student picture if provided
    if (image_url?.trim()) {
      await queryDb(
        `INSERT INTO website_student_pictures (website_id, student_id, image_url, is_primary)
         VALUES ($1, $2, $3, TRUE)`,
        [website.id, student.id, image_url.trim()]
      );
    }

    // 6. Record student signature if provided
    if (signature_url?.trim()) {
      await queryDb(
        `INSERT INTO website_student_signatures (website_id, student_id, signature_url, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET signature_url = EXCLUDED.signature_url, updated_at = CURRENT_TIMESTAMP`,
        [website.id, student.id, signature_url.trim()]
      );
    }

    // Ensure student is active and verified in website_students
    await queryDb(
      `UPDATE website_students
       SET is_active = TRUE,
           is_verified = TRUE,
           verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2`,
      [student.id, website.id]
    );

    const isAutoVerified = true;
    const verificationStatus = 'verified';
    const isActive = true;

    const responseMessage = 'Account setup completed successfully! Your student account is now verified and active. You can log in directly to your student portal.';

    return NextResponse.json({
      success: true,
      message: responseMessage,
      payload: {
        student_id: student.id,
        verification_status: verificationStatus,
        is_active: isActive,
        requires_staff_verification: false,
      },
    });
  } catch (error) {
    console.error('Error submitting student setup:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while saving setup details.' }, { status: 500 });
  }
}

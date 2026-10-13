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
              i.name, i.email, i.number, i.gender, i.blood_group, i.date_of_birth,
              i.religion, i.admission_date, i.is_registered, i.is_verified,
              i.verification_status, i.verification_token_expires,
              c.name AS class_name, sec.name AS section_name, ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.website_id = $1 
         AND (
           ($2::text IS NOT NULL AND (i.verification_token = $2 OR s.registration_no = $2))
           OR ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(s.email, i.email))) = LOWER(TRIM($3)))
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

    // Fetch existing addresses, guardians, picture, signature if any
    const [addrRes, guardRes, picRes, sigRes] = await Promise.all([
      queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY id DESC LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id]),
    ]);

    return NextResponse.json({
      success: true,
      payload: {
        student: {
          ...student,
          email: student.registered_email || student.email
        },
        address: addrRes.rows[0] || null,
        guardian: guardRes.rows[0] || null,
        picture: picRes.rows[0] || null,
        signature: sigRes.rows[0] || null,
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
              i.email AS info_email, i.name, i.is_verified, i.verification_token_expires
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 
         AND (i.verification_token = $2 OR s.registration_no = $2 OR LOWER(TRIM(s.email)) = LOWER(TRIM($2)))
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
            website_id, student_id, password, email, is_registered, is_verified,
            verification_status, verified_at, updated_at
         )
         VALUES ($1, $2, $3, $4, TRUE, TRUE, 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            password = EXCLUDED.password,
            email = EXCLUDED.email,
            is_registered = TRUE,
            is_verified = TRUE,
            verification_status = 'verified',
            updated_at = CURRENT_TIMESTAMP`,
        [website.id, student.id, hashedPassword, inputEmail]
      );
      await queryDb(
        `UPDATE website_students
         SET password = $1, email = $2, updated_at = CURRENT_TIMESTAMP
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
      await queryDb(
        `UPDATE website_student_info
         SET name = COALESCE($1, name),
             number = COALESCE($2, number),
             gender = COALESCE($3, gender),
             blood_group = COALESCE($4, blood_group),
             date_of_birth = COALESCE($5, date_of_birth),
             religion = COALESCE($6, religion),
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $7 AND website_id = $8`,
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
      await queryDb(
        `INSERT INTO website_student_guardians (
            website_id, student_id,
            father_name, father_phone, father_nid, father_occupation,
            mother_name, mother_phone, mother_nid, mother_occupation,
            guardian_name, guardian_relation, guardian_phone, guardian_email, guardian_address,
            updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            father_name = EXCLUDED.father_name,
            father_phone = EXCLUDED.father_phone,
            father_nid = EXCLUDED.father_nid,
            father_occupation = EXCLUDED.father_occupation,
            mother_name = EXCLUDED.mother_name,
            mother_phone = EXCLUDED.mother_phone,
            mother_nid = EXCLUDED.mother_nid,
            mother_occupation = EXCLUDED.mother_occupation,
            guardian_name = EXCLUDED.guardian_name,
            guardian_relation = EXCLUDED.guardian_relation,
            guardian_phone = EXCLUDED.guardian_phone,
            guardian_email = EXCLUDED.guardian_email,
            guardian_address = EXCLUDED.guardian_address,
            updated_at = CURRENT_TIMESTAMP`,
        [
          website.id,
          student.id,
          father_name?.trim() || null,
          father_phone?.trim() || null,
          father_nid?.trim() || null,
          father_occupation?.trim() || null,
          mother_name?.trim() || null,
          mother_phone?.trim() || null,
          mother_nid?.trim() || null,
          mother_occupation?.trim() || null,
          guardian_name?.trim() || null,
          guardian_relation?.trim() || 'Father',
          guardian_phone?.trim() || null,
          guardian_email?.trim() || null,
          guardian_address?.trim() || null,
        ]
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

    // 1. Upsert website_student_info
    if (hashedPassword) {
      await queryDb(
        `INSERT INTO website_student_info (
            website_id, student_id, password, name, email, number, gender, blood_group,
            date_of_birth, religion, is_registered, is_verified, verification_status,
            verified_at, verification_notes, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, TRUE, 'verified', CURRENT_TIMESTAMP, 'Verified via institutional email mailer OTP', CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            password = EXCLUDED.password,
            name = COALESCE(EXCLUDED.name, website_student_info.name),
            email = EXCLUDED.email,
            number = COALESCE(EXCLUDED.number, website_student_info.number),
            gender = COALESCE(EXCLUDED.gender, website_student_info.gender),
            blood_group = COALESCE(EXCLUDED.blood_group, website_student_info.blood_group),
            date_of_birth = COALESCE(EXCLUDED.date_of_birth, website_student_info.date_of_birth),
            religion = COALESCE(EXCLUDED.religion, website_student_info.religion),
            is_registered = TRUE,
            is_verified = TRUE,
            verification_status = 'verified',
            updated_at = CURRENT_TIMESTAMP`,
        [
          website.id,
          student.id,
          hashedPassword,
          name?.trim() || null,
          inputEmail,
          number || null,
          gender || null,
          blood_group || null,
          date_of_birth || null,
          religion || null,
        ]
      );
    } else {
      await queryDb(
        `UPDATE website_student_info
         SET name = COALESCE($1, name),
             email = $2,
             number = COALESCE($3, number),
             gender = COALESCE($4, gender),
             blood_group = COALESCE($5, blood_group),
             date_of_birth = COALESCE($6, date_of_birth),
             religion = COALESCE($7, religion),
             is_registered = TRUE,
             is_verified = TRUE,
             verification_status = 'verified',
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $8 AND website_id = $9`,
        [
          name?.trim() || null,
          inputEmail,
          number || null,
          gender || null,
          blood_group || null,
          date_of_birth || null,
          religion || null,
          student.id,
          website.id,
        ]
      );
    }

    // 2. In website_students, update and activate
    await queryDb(
      `UPDATE website_students
       SET email = $1,
           name = COALESCE($2, name),
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND website_id = $4`,
      [inputEmail, name?.trim() || null, student.id, website.id]
    );

    // 3. Upsert website_student_addresses
    await queryDb(
      `INSERT INTO website_student_addresses (
          website_id, student_id, present_address, permanent_address,
          city, district, upazila, postal_code, country, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id)
       DO UPDATE SET
          present_address = EXCLUDED.present_address,
          permanent_address = EXCLUDED.permanent_address,
          city = EXCLUDED.city,
          district = EXCLUDED.district,
          upazila = EXCLUDED.upazila,
          postal_code = EXCLUDED.postal_code,
          country = EXCLUDED.country,
          updated_at = CURRENT_TIMESTAMP`,
      [
        website.id,
        student.id,
        present_address?.trim() || null,
        permanent_address?.trim() || present_address?.trim() || null,
        city?.trim() || null,
        district?.trim() || null,
        upazila?.trim() || null,
        postal_code?.trim() || null,
        country?.trim() || 'Bangladesh',
      ]
    );

    // 4. Upsert website_student_guardians if guardian details provided
    if (father_name || mother_name || guardian_name) {
      await queryDb(
        `INSERT INTO website_student_guardians (
            website_id, student_id,
            father_name, father_phone, father_nid, father_occupation,
            mother_name, mother_phone, mother_nid, mother_occupation,
            guardian_name, guardian_relation, guardian_phone, guardian_email, guardian_address,
            updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            father_name = EXCLUDED.father_name,
            father_phone = EXCLUDED.father_phone,
            father_nid = EXCLUDED.father_nid,
            father_occupation = EXCLUDED.father_occupation,
            mother_name = EXCLUDED.mother_name,
            mother_phone = EXCLUDED.mother_phone,
            mother_nid = EXCLUDED.mother_nid,
            mother_occupation = EXCLUDED.mother_occupation,
            guardian_name = EXCLUDED.guardian_name,
            guardian_relation = EXCLUDED.guardian_relation,
            guardian_phone = EXCLUDED.guardian_phone,
            guardian_email = EXCLUDED.guardian_email,
            guardian_address = EXCLUDED.guardian_address,
            updated_at = CURRENT_TIMESTAMP`,
        [
          website.id,
          student.id,
          father_name?.trim() || null,
          father_phone?.trim() || null,
          father_nid?.trim() || null,
          father_occupation?.trim() || null,
          mother_name?.trim() || null,
          mother_phone?.trim() || null,
          mother_nid?.trim() || null,
          mother_occupation?.trim() || null,
          guardian_name?.trim() || null,
          guardian_relation?.trim() || 'Father',
          guardian_phone?.trim() || null,
          guardian_email?.trim() || null,
          guardian_address?.trim() || null,
        ]
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

    const responseMessage = isAutoVerified
      ? 'Account setup completed successfully! Your student account is now verified and active. You can log in directly to your student portal.'
      : 'Profile setup submitted for staff verification! Since your email was not pre-registered by school administration, your profile has been sent to staff for verification. You will be able to log in once staff approves your account in staff panel.';

    return NextResponse.json({
      success: true,
      message: responseMessage,
      payload: {
        student_id: student.id,
        verification_status: verificationStatus,
        is_active: isActive,
        requires_staff_verification: !isAutoVerified,
      },
    });
  } catch (error) {
    console.error('Error submitting student setup:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while saving setup details.' }, { status: 500 });
  }
}

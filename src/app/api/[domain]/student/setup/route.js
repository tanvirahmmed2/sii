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

    if (!token) {
      return NextResponse.json({ success: false, error: 'Setup token is required.' }, { status: 400 });
    }

    const res = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              i.name, i.email, i.number, i.gender, i.blood_group, i.date_of_birth,
              i.religion, i.admission_date, i.is_registered, i.is_verified,
              i.verification_status, i.verification_token_expires,
              c.name AS class_name, sec.name AS section_name, ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.website_id = $1 AND (i.verification_token = $2 OR s.registration_no = $2)
       LIMIT 1`,
      [website.id, token]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired setup token. Please contact administration.' },
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
        student,
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

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password is required and must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Verify token exists and is valid
    const studentCheck = await queryDb(
      `SELECT s.id, s.registration_no,
              i.email, i.name, i.is_verified, i.verification_token_expires
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 AND (i.verification_token = $2 OR s.registration_no = $2)
       LIMIT 1`,
      [website.id, token.trim()]
    );

    if (studentCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid or unrecognized setup token.' }, { status: 400 });
    }

    const student = studentCheck.rows[0];

    if (student.verification_token_expires && new Date() > new Date(student.verification_token_expires)) {
      return NextResponse.json(
        { success: false, error: 'This setup link has expired. Please ask staff to resend your link.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // 1. Update website_student_info: set password, name, email, mark is_registered = true, verification_status = 'submitted'
    await queryDb(
      `UPDATE website_student_info
       SET password = $1,
           name = COALESCE($2, name),
           email = COALESCE($3, email),
           number = COALESCE($4, number),
           gender = COALESCE($5, gender),
           blood_group = COALESCE($6, blood_group),
           date_of_birth = COALESCE($7, date_of_birth),
           religion = COALESCE($8, religion),
           is_registered = TRUE,
           verification_status = 'submitted',
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $9 AND website_id = $10`,
      [
        hashedPassword,
        name?.trim() || null,
        email?.trim()?.toLowerCase() || null,
        number || null,
        gender || null,
        blood_group || null,
        date_of_birth || null,
        religion || null,
        student.id,
        website.id,
      ]
    );

    // 2. In website_students, ensure is_active remains FALSE (waiting for staff verification)
    await queryDb(
      `UPDATE website_students
       SET is_active = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2`,
      [student.id, website.id]
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
        present_address || null,
        permanent_address || null,
        city || null,
        district || null,
        upazila || null,
        postal_code || null,
        country || 'Bangladesh',
      ]
    );

    // 4. Upsert website_student_guardians
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
        father_name || null,
        father_phone || null,
        father_nid || null,
        father_occupation || null,
        mother_name || null,
        mother_phone || null,
        mother_nid || null,
        mother_occupation || null,
        guardian_name || null,
        guardian_relation || null,
        guardian_phone || null,
        guardian_email || null,
        guardian_address || null,
      ]
    );

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

    return NextResponse.json({
      success: true,
      message:
        'Account setup submitted successfully! Your student profile is now under review by institution staff. You will be able to log in once staff approves your account.',
      payload: {
        student_id: student.id,
        verification_status: 'submitted',
      },
    });
  } catch (error) {
    console.error('Error submitting student setup:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while saving setup details.' }, { status: 500 });
  }
}

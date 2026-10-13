import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * POST: Validates the 6-digit email OTP for student account setup
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { email, code, registration_no } = body;

    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Registered student email is required.' }, { status: 400 });
    }

    if (!code?.trim()) {
      return NextResponse.json({ success: false, error: '6-digit verification code is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanRegNo = registration_no?.trim() || null;

    // Look up student by email or registration number
    let studentRes = await queryDb(
      `SELECT s.id, s.registration_no, s.roll_no, s.email, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.department_id,
              s.two_factor_code AS student_two_factor_code, s.two_factor_expires AS student_two_factor_expires,
              i.name, i.number, i.gender, i.blood_group, i.date_of_birth, i.religion,
              i.two_factor_code, i.two_factor_expires, i.verification_token,
              c.name AS class_name, sec.name AS section_name, ses.name AS session_name,
              d.name AS department_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       LEFT JOIN website_departments d ON s.department_id = d.id
       WHERE s.website_id = $1 
         AND LOWER(TRIM(COALESCE(s.email, i.email))) = $2
         ${cleanRegNo ? 'AND (s.registration_no = $3 OR s.roll_no = $3 OR s.student_unique_id = $3)' : ''}
       LIMIT 1`,
      cleanRegNo ? [website.id, cleanEmail, cleanRegNo] : [website.id, cleanEmail]
    );

    if (studentRes.rows.length === 0 && cleanRegNo) {
      studentRes = await queryDb(
        `SELECT s.id, s.registration_no, s.roll_no, s.email, s.student_unique_id,
                s.class_id, s.section_id, s.session_id, s.department_id,
                s.two_factor_code AS student_two_factor_code, s.two_factor_expires AS student_two_factor_expires,
                i.name, i.number, i.gender, i.blood_group, i.date_of_birth, i.religion,
                i.two_factor_code, i.two_factor_expires, i.verification_token,
                c.name AS class_name, sec.name AS section_name, ses.name AS session_name,
                d.name AS department_name
         FROM website_students s
         LEFT JOIN website_student_info i ON s.id = i.student_id
         LEFT JOIN website_classes c ON s.class_id = c.id
         LEFT JOIN website_sections sec ON s.section_id = sec.id
         LEFT JOIN website_sessions ses ON s.session_id = ses.id
         LEFT JOIN website_departments d ON s.department_id = d.id
         WHERE s.website_id = $1 
           AND (s.registration_no = $2 OR s.roll_no = $2 OR s.student_unique_id = $2)
         LIMIT 1`,
        [website.id, cleanRegNo]
      );
    }

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No student record found matching these details.'
      }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Check code match from website_students or website_student_info
    const activeCode = student.student_two_factor_code || student.two_factor_code;
    const activeExpires = student.student_two_factor_expires || student.two_factor_expires;

    let isCodeValid = false;
    if (activeCode && activeCode === cleanCode) {
      if (!activeExpires || new Date() <= new Date(activeExpires)) {
        isCodeValid = true;
      }
    }

    // Fallback: Check website_email_verifications
    if (!isCodeValid) {
      try {
        const verCheck = await queryDb(
          `SELECT id FROM website_email_verifications
           WHERE website_id = $1 AND LOWER(email) = $2 AND otp_code = $3 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
           ORDER BY id DESC LIMIT 1`,
          [website.id, cleanEmail, cleanCode]
        );
        if (verCheck.rows.length > 0) {
          isCodeValid = true;
        }
      } catch (_) {}
    }

    if (!isCodeValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired verification code. Please check your email and try again.'
      }, { status: 400 });
    }

    // Update website_students: clear temporary OTP and ensure email is recorded
    await queryDb(
      `UPDATE website_students
       SET two_factor_code = NULL,
           two_factor_expires = NULL,
           email = COALESCE(email, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND website_id = $3`,
      [cleanEmail, student.id, website.id]
    );

    // If website_student_info exists, update it as well
    try {
      await queryDb(
        `UPDATE website_student_info
         SET is_verified = TRUE,
             two_factor_code = NULL,
             two_factor_expires = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $1 AND website_id = $2`,
        [student.id, website.id]
      );
    } catch (_) {}

    // Mark website_email_verifications as verified
    try {
      await queryDb(
        `UPDATE website_email_verifications
         SET is_verified = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE website_id = $1 AND LOWER(email) = $2 AND otp_code = $3`,
        [website.id, cleanEmail, cleanCode]
      );
    } catch (_) {}

    // Fetch address, guardian, picture if any
    const [addrRes, guardRes, picRes, sigRes] = await Promise.all([
      queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY id DESC LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id]),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully! You may now proceed to complete your student profile.',
      payload: {
        verified: true,
        setup_token: student.verification_token || student.registration_no,
        student: {
          id: student.id,
          registration_no: student.registration_no,
          roll_no: student.roll_no,
          email: cleanEmail,
          name: student.name,
          number: student.number,
          gender: student.gender,
          blood_group: student.blood_group,
          date_of_birth: student.date_of_birth,
          religion: student.religion,
          class_name: student.class_name,
          section_name: student.section_name,
          session_name: student.session_name,
        },
        address: addrRes.rows[0] || null,
        guardian: guardRes.rows[0] || null,
        picture: picRes.rows[0] || null,
        signature: sigRes.rows[0] || null,
      }
    });
  } catch (error) {
    console.error('Error verifying student setup OTP:', error);
    return NextResponse.json({ success: false, error: 'Internal server error verifying code.' }, { status: 500 });
  }
}

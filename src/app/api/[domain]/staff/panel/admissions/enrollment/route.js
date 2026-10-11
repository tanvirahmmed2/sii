import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';
import { hashPassword } from 'src/lib/middleware/students.js';

/**
 * GET /api/[domain]/staff/panel/admissions/enrollment
 * Lists selected candidates ready for manual student portal registration, plus classes & sections.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const websiteId = auth.website.id;

    // Fetch candidates with status = 'selected' (ready for enrollment)
    const candidatesRes = await queryDb(`
      SELECT a.*,
             adm.title AS circular_title, adm.class_id AS circular_class_id, adm.session_id AS circular_session_id,
             c.name AS class_name,
             inf.father_name, inf.father_phone, inf.mother_name,
             inf.guardian_name, inf.guardian_phone,
             inf.present_address, inf.permanent_address,
             inf.previous_school, inf.photo_url, inf.signature_url
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_classes c ON c.id = adm.class_id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      WHERE a.website_id = $1 AND a.status = 'selected'
      ORDER BY a.merit_position ASC NULLS LAST, a.created_at ASC
    `, [websiteId]);

    // Also fetch enrolled history
    const enrolledRes = await queryDb(`
      SELECT a.id, a.application_no, a.applicant_name, a.email, a.phone,
             a.enrolled_at, a.enrolled_student_id,
             s.registration_no, s.roll_no AS student_roll_no,
             c.name AS class_name
      FROM website_admission_applicants a
      JOIN website_students s ON s.id = a.enrolled_student_id
      LEFT JOIN website_classes c ON c.id = s.class_id
      WHERE a.website_id = $1 AND a.status = 'enrolled'
      ORDER BY a.enrolled_at DESC LIMIT 20
    `, [websiteId]);

    // Fetch classes, sections, sessions for registration dropdowns
    const [classesRes, sectionsRes, sessionsRes] = await Promise.all([
      queryDb(`SELECT id, name FROM website_classes WHERE website_id = $1 ORDER BY name ASC`, [websiteId]),
      queryDb(`SELECT id, class_id, name FROM website_sections WHERE website_id = $1 ORDER BY name ASC`, [websiteId]),
      queryDb(`SELECT id, name FROM website_sessions WHERE website_id = $1 ORDER BY id DESC`, [websiteId])
    ]);

    return NextResponse.json({
      success: true,
      ready_candidates: candidatesRes.rows,
      recently_enrolled: enrolledRes.rows,
      classes: classesRes.rows,
      sections: sectionsRes.rows,
      sessions: sessionsRes.rows
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions/enrollment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/admissions/enrollment
 * Allowed staff manually registers a selected candidate into website_students.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      applicant_id,
      class_id,
      section_id,
      session_id,
      roll_no,
      registration_no
    } = body;

    if (!applicant_id) {
      return NextResponse.json({ success: false, error: 'applicant_id is required.' }, { status: 400 });
    }

    const appId = parseInt(applicant_id, 10);

    // 1. Fetch applicant and verify status is 'selected'
    const appRes = await queryDb(`
      SELECT a.*, inf.*, adm.class_id AS circular_class_id, adm.session_id AS circular_session_id
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      WHERE a.id = $1 AND a.website_id = $2
    `, [appId, auth.website.id]);

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const candidate = appRes.rows[0];

    if (candidate.status === 'enrolled') {
      return NextResponse.json({
        success: false,
        error: `This candidate has already been enrolled (Student ID #${candidate.enrolled_student_id}).`
      }, { status: 400 });
    }

    if (candidate.status !== 'selected') {
      return NextResponse.json({
        success: false,
        error: `Only candidates with status "selected" can be enrolled. Current status: "${candidate.status}".`
      }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const finalRegNo = registration_no?.trim() || `REG-${year}-${String(appId).padStart(4, '0')}`;
    const studentUniqueId = `STU-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const finalRoll = roll_no?.trim() || candidate.roll_no || String(appId).slice(-3);
    const finalClassId = class_id ? parseInt(class_id, 10) : candidate.circular_class_id;
    const finalSessionId = session_id ? parseInt(session_id, 10) : candidate.circular_session_id;
    const finalSectionId = section_id ? parseInt(section_id, 10) : null;

    // Check uniqueness of registration_no
    const regCheck = await queryDb(`
      SELECT id FROM website_students
      WHERE website_id = $1 AND registration_no = $2
    `, [auth.website.id, finalRegNo]);

    if (regCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Registration number '${finalRegNo}' is already taken. Please specify a unique registration number.`
      }, { status: 400 });
    }

    // 2. Insert into website_students with email
    const studentRes = await queryDb(`
      INSERT INTO website_students (
        website_id, registration_no, class_id, section_id, session_id,
        roll_no, email, student_unique_id, is_active
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, FALSE
      ) RETURNING *
    `, [
      auth.website.id,
      finalRegNo,
      finalClassId,
      finalSectionId,
      finalSessionId,
      finalRoll,
      candidate.email.toLowerCase().trim(),
      studentUniqueId
    ]);

    const student = studentRes.rows[0];

    // 3. Create website_student_info with candidate data and temporary password
    const tempPasswordHash = await hashPassword(`Std@${studentUniqueId}`);
    const setupToken = crypto.randomBytes(16).toString('hex');
    const tokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days setup window

    await queryDb(`
      INSERT INTO website_student_info (
        website_id, student_id, name, email, number, gender,
        date_of_birth, admission_date, password, verification_token,
        verification_token_expires, verification_status, is_registered, is_verified,
        verified_by_staff_id, verified_at, verification_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, CURRENT_DATE, $8, $9,
        $10, 'pending_setup', FALSE, TRUE,
        $11, CURRENT_TIMESTAMP, $12
      )
      ON CONFLICT (student_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        number = EXCLUDED.number,
        gender = EXCLUDED.gender,
        date_of_birth = EXCLUDED.date_of_birth,
        verification_token = EXCLUDED.verification_token,
        verification_token_expires = EXCLUDED.verification_token_expires,
        updated_at = CURRENT_TIMESTAMP
    `, [
      auth.website.id,
      student.id,
      candidate.applicant_name,
      candidate.email.toLowerCase().trim(),
      candidate.phone,
      candidate.gender || 'Male',
      candidate.date_of_birth,
      tempPasswordHash,
      setupToken,
      tokenExpires,
      auth.user?.id || null,
      `Manually enrolled from admission application #${candidate.application_no}`
    ]);

    // 4. Copy address info if exists
    if (candidate.present_address || candidate.permanent_address) {
      await queryDb(`
        INSERT INTO website_student_addresses (
          website_id, student_id, present_address, permanent_address
        ) VALUES (
          $1, $2, $3, $4
        )
        ON CONFLICT DO NOTHING
      `, [
        auth.website.id,
        student.id,
        candidate.present_address || 'Same as permanent',
        candidate.permanent_address || candidate.present_address || ''
      ]);
    }

    // 5. Copy guardian info if exists
    if (candidate.father_name || candidate.mother_name || candidate.guardian_name) {
      await queryDb(`
        INSERT INTO website_student_guardians (
          website_id, student_id, father_name, father_phone, mother_name,
          guardian_name, guardian_phone, guardian_relation
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8
        )
        ON CONFLICT DO NOTHING
      `, [
        auth.website.id,
        student.id,
        candidate.father_name,
        candidate.father_phone,
        candidate.mother_name,
        candidate.guardian_name || candidate.father_name,
        candidate.guardian_phone || candidate.father_phone,
        candidate.guardian_relation || 'Father'
      ]);
    }

    // 6. Copy photo and signature if uploaded
    if (candidate.photo_url) {
      await queryDb(`
        INSERT INTO website_student_pictures (
          website_id, student_id, image_url, image_id
        ) VALUES ($1, $2, $3, $4)
      `, [auth.website.id, student.id, candidate.photo_url, candidate.photo_id || null]);
    }

    if (candidate.signature_url) {
      await queryDb(`
        INSERT INTO website_student_signatures (
          website_id, student_id, signature_url, signature_id
        ) VALUES ($1, $2, $3, $4)
      `, [auth.website.id, student.id, candidate.signature_url, candidate.signature_id || null]);
    }

    // 7. Update candidate status to 'enrolled'
    await queryDb(`
      UPDATE website_admission_applicants
      SET status = 'enrolled',
          enrolled_at = CURRENT_TIMESTAMP,
          enrolled_student_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND website_id = $3
    `, [student.id, appId, auth.website.id]);

    return NextResponse.json({
      success: true,
      message: `Candidate '${candidate.applicant_name}' enrolled successfully into student portal!`,
      student: {
        id: student.id,
        registration_no: student.registration_no,
        roll_no: student.roll_no,
        email: student.email,
        student_unique_id: student.student_unique_id,
        setup_token: setupToken
      }
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions/enrollment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

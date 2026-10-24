import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';
import { hashPassword } from 'src/lib/middleware/students.js';
import { checkInstitutionEmailAvailability } from 'src/lib/database/emailUniqueness.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { buildStudentSetupUrl } from 'src/lib/student/urls.js';

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
             inf.data AS info_data,
             grd.data AS guardian_data,
             addr.data AS address_data,
             grd.data->>'father_name' AS father_name,
             grd.data->>'father_phone' AS father_phone,
             grd.data->>'mother_name' AS mother_name,
             grd.data->>'guardian_name' AS guardian_name,
             grd.data->>'guardian_phone' AS guardian_phone,
             addr.data->>'present_address' AS present_address,
             addr.data->>'permanent_address' AS permanent_address,
             img.photo_url, img.signature_url
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_classes c ON c.id = adm.class_id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      LEFT JOIN website_admission_applicant_guardians grd ON grd.applicant_id = a.id
      LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
      WHERE a.website_id = $1 AND a.status = 'selected'
      ORDER BY a.merit_position ASC NULLS LAST, a.created_at ASC
    `, [websiteId]);

    const enrichedCandidates = candidatesRes.rows.map(row => ({
      ...row,
      ...(row.info_data || {}),
      ...(row.guardian_data || {}),
      ...(row.address_data || {})
    }));

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
      candidates: candidatesRes.rows,
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
      SELECT a.*,
             inf.data AS info_data,
             g.data AS guardian_data,
             addr.data AS address_data,
             img.photo_url,
             img.photo_public_id,
             img.signature_url,
             img.signature_public_id,
             adm.class_id AS circular_class_id, adm.session_id AS circular_session_id, adm.department_id AS circular_department_id
      FROM website_admission_applicants a
      JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      LEFT JOIN website_admission_applicant_guardians g ON g.applicant_id = a.id
      LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
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
    // Do not add REG- prefix in registration number; cleanly strip it if provided
    const cleanReg = registration_no?.trim() ? registration_no.trim().replace(/^REG-?/i, '') : '';
    const finalRegNo = cleanReg || `${year}-${String(appId).padStart(4, '0')}`;
    const studentUniqueId = `STU-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const finalRoll = roll_no?.trim() || candidate.roll_no || String(appId).slice(-3);
    const finalClassId = class_id ? parseInt(class_id, 10) : candidate.circular_class_id;
    const finalSessionId = session_id ? parseInt(session_id, 10) : candidate.circular_session_id;
    const finalSectionId = section_id ? parseInt(section_id, 10) : null;

    // Check uniqueness of registration_no per website
    const regCheck = await queryDb(`
      SELECT id FROM website_students
      WHERE website_id = $1 AND LOWER(TRIM(registration_no)) = LOWER(TRIM($2))
    `, [auth.website.id, finalRegNo]);

    if (regCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Registration number '${finalRegNo}' is already taken in this institution. Please specify a unique registration number.`
      }, { status: 400 });
    }

    const candidateEmail = candidate.email ? candidate.email.toLowerCase().trim() : null;
    if (candidateEmail) {
      const emailAvail = await checkInstitutionEmailAvailability(auth.website.id, candidateEmail, {
        excludeRole: 'applicant',
        excludeId: appId
      });
      if (!emailAvail.available) {
        return NextResponse.json({
          success: false,
          error: `Cannot enroll student: ${emailAvail.message}`
        }, { status: 409 });
      }
    }


    // 2. Perform atomic in-database enrollment via RPC
    const setupToken = crypto.randomBytes(32).toString('hex');
    const enrollResult = await queryDb(
      `SELECT fn_enroll_admission_applicant($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS new_student_id`,
      [
        appId,
        finalClassId,
        finalSessionId,
        finalSectionId,
        candidate.circular_department_id || null,
        finalRegNo,
        studentUniqueId,
        finalRoll,
        null, // temp_password_hash (student sets password via setup token)
        setupToken
      ]
    );

    const newStudentId = enrollResult.rows[0]?.new_student_id;
    if (!newStudentId) {
      throw new Error('Enrollment RPC failed to return a student ID.');
    }

    const student = {
      id: newStudentId,
      registration_no: finalRegNo,
      roll_no: finalRoll,
      email: candidate.email.toLowerCase().trim(),
      student_unique_id: studentUniqueId
    };

    // 8. Generate full student setup URL and send official setup email
    let setupUrl = `/auth/student/setup?email=${encodeURIComponent(candidateEmail || '')}`;
    if (candidateEmail) {
      try {
        setupUrl = buildStudentSetupUrl(auth.website, null, request, candidateEmail);
        const instName = auth.website.name || 'Campus Student Portal';

        const emailHtml = buildStyledEmail({
          title: `Welcome to ${instName}`,
          subtitle: 'Admission Enrollment & Portal Account Setup',
          recipientName: candidate.applicant_name || 'Student',
          bodyParagraphs: [
            `Congratulations! Your admission application (<strong>#${candidate.application_no}</strong>) has been finalized, and you have been officially enrolled into the student body at <strong>${instName}</strong>.`,
            `Please keep your institutional credentials safe:`,
            `<div style="margin: 12px 0; padding: 14px 18px; background-color: #f1f5f9; border-left: 4px solid #4f46e5; border-radius: 4px; font-size: 13px; color: #1e293b;">
              <div style="margin-bottom: 6px;"><strong>Registration No:</strong> <code style="font-family: monospace; font-size: 14px; font-weight: 700; color: #4338ca;">${student.registration_no}</code></div>
              <div style="margin-bottom: 6px;"><strong>Student Unique ID:</strong> <code style="font-family: monospace; font-size: 13px; color: #0f172a;">${student.student_unique_id}</code></div>
              ${student.roll_no ? `<div style="margin-bottom: 6px;"><strong>Roll No:</strong> ${student.roll_no}</div>` : ''}
              <div><strong>Registered Email:</strong> <code style="font-family: monospace; font-size: 13px; color: #0f172a;">${candidateEmail}</code></div>
            </div>`,
            `To access the student portal (gradesheets, notice boards, class schedule, and ID card), please click the button below to complete your one-time email verification and configure your personal account password:`,
          ],
          actionText: 'Activate & Set Up Student Account →',
          actionUrl: setupUrl,
          footerNote: `If you have questions regarding your enrollment, please contact the ${instName} admissions and administration office.`
        });

        await sendEmail({
          to: candidateEmail,
          toName: candidate.applicant_name || 'Student',
          subject: `Enrollment Confirmation & Portal Setup - ${instName}`,
          html: emailHtml,
          websiteId: auth.website.id
        });
      } catch (mailErr) {
        console.warn('Mail dispatch warning on admission enrollment:', mailErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Candidate '${candidate.applicant_name}' enrolled successfully into student portal!`,
      setup_url: setupUrl,
      student: {
        id: student.id,
        registration_no: student.registration_no,
        roll_no: student.roll_no,
        email: student.email,
        student_unique_id: student.student_unique_id,
        setup_token: null
      }
    });

  } catch (error) {
    console.error('Error in POST /staff/panel/admissions/enrollment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

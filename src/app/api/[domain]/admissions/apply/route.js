import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * GET /api/[domain]/admissions/apply?admission_id=...
 * Returns active circular details and application fee for candidate review before submitting.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id');

    let sql = `
      SELECT a.*, c.name AS class_name, s.name AS session_name,
             d.name AS department_name,
             af.fee_title, af.amount AS fee_amount, af.currency AS fee_currency, af.late_fee,
             ex.exam_date AS admission_exam_date, ex.admit_publish_date AS admission_admit_publish_date,
             ex.venue AS exam_venue, ex.instructions AS exam_instructions
      FROM website_admissions a
      LEFT JOIN website_classes c ON c.id = a.class_id
      LEFT JOIN website_sessions s ON s.id = a.session_id
      LEFT JOIN website_departments d ON d.id = a.department_id
      LEFT JOIN website_admission_fees af ON af.admission_id = a.id AND af.status = 'active'
      LEFT JOIN website_admission_exams ex ON ex.admission_id = a.id
      WHERE a.website_id = $1 AND a.is_published = TRUE AND a.status IN ('open', 'upcoming')
    `;
    const params = [website.id];

    if (admissionId) {
      sql += ` AND a.id = $2`;
      params.push(parseInt(admissionId, 10));
    }

    sql += ` ORDER BY a.created_at DESC`;

    const res = await queryDb(sql, params);

    // Fetch subjects for any exam-based circulars
    const examSubjectsRes = await queryDb(`
      SELECT id, admission_id, admission_exam_id, title, mark, time
      FROM website_admission_exam_subjects
      WHERE website_id = $1
      ORDER BY id ASC
    `, [website.id]);

    const subjectsByAdmission = {};
    for (const sub of examSubjectsRes.rows) {
      if (!subjectsByAdmission[sub.admission_id]) {
        subjectsByAdmission[sub.admission_id] = [];
      }
      subjectsByAdmission[sub.admission_id].push(sub);
    }

    const circularsWithSubjects = res.rows.map((circ) => ({
      ...circ,
      exam_subjects: subjectsByAdmission[circ.id] || []
    }));

    return NextResponse.json({
      success: true,
      circulars: circularsWithSubjects
    });
  } catch (error) {
    console.error('Error in GET /admissions/apply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/admissions/apply
 * Candidate submits application form -> records applicant, info, and fee payment entry.
 * Note: payment_status is in website_admission_fee_payments.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      admission_id,
      circular_id,
      applicant_name,
      email,
      phone,
      gender = 'Male',
      date_of_birth,
      father_name,
      father_phone,
      father_occupation,
      mother_name,
      mother_phone,
      mother_occupation,
      guardian_name,
      guardian_phone,
      guardian_relation,
      address,
      present_address,
      permanent_address,
      last_class,
      last_class_grade,
      last_institution,
      previous_school,
      previous_gpa
    } = body;

    const targetAdmId = admission_id || circular_id;
    if (!targetAdmId) {
      return NextResponse.json({ success: false, error: 'Please select an admission circular target.' }, { status: 400 });
    }
    if (!applicant_name || !applicant_name.trim()) {
      return NextResponse.json({ success: false, error: 'Applicant candidate name is required.' }, { status: 400 });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid candidate email address is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, error: 'Contact phone number is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 0. Enforce backend email verification check
    const verifiedCheck = await queryDb(`
      SELECT id, is_verified, expires_at
      FROM website_email_verifications
      WHERE website_id = $1 AND LOWER(email) = $2 AND purpose = 'admission' AND is_verified = TRUE
      ORDER BY id DESC
      LIMIT 1
    `, [website.id, cleanEmail]);

    if (verifiedCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Email verification required. Please verify your email with the one-time passcode before submitting.'
      }, { status: 403 });
    }

    const admId = parseInt(targetAdmId, 10);

    // 1. Verify circular exists and is active
    const admRes = await queryDb(`
      SELECT a.*, af.amount AS fee_amount, af.currency AS fee_currency, af.late_fee
      FROM website_admissions a
      LEFT JOIN website_admission_fees af ON af.admission_id = a.id AND af.status = 'active'
      WHERE a.id = $1 AND a.website_id = $2
    `, [admId, website.id]);

    if (admRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected admission circular is invalid or closed.' }, { status: 404 });
    }

    const circular = admRes.rows[0];

    // Check circular dates
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(circular.start_date).toISOString().split('T')[0];
    const endDate = new Date(circular.end_date).toISOString().split('T')[0];

    if (today < startDate) {
      return NextResponse.json({ success: false, error: 'Application period has not opened yet for this circular.' }, { status: 400 });
    }
    if (today > endDate) {
      return NextResponse.json({ success: false, error: 'Application period has concluded for this circular.' }, { status: 400 });
    }

    // Generate Application Number: APP-{year}-{random_seq}
    const countRes = await queryDb(`SELECT COUNT(*)::int AS count FROM website_admission_applicants WHERE website_id = $1`, [website.id]);
    const seq = (countRes.rows[0].count || 0) + 1001;
    const year = new Date().getFullYear();
    const appNumber = `APP-${year}-${seq}`;

    const resolvedLastClass = last_class ? last_class.trim() : (body.past_school_class || 'N/A');
    const resolvedLastGrade = last_class_grade !== undefined && last_class_grade !== '' && last_class_grade !== null
      ? parseFloat(last_class_grade)
      : (previous_gpa ? parseFloat(previous_gpa) : null);
    const resolvedLastInst = last_institution ? last_institution.trim() : (previous_school || body.past_school_name || 'N/A');

    // 2. Insert into website_admission_applicants (payment_status is NOT in this table)
    const insertApp = await queryDb(`
      INSERT INTO website_admission_applicants (
        website_id, admission_id, application_no, applicant_name, email,
        phone, gender, date_of_birth, status,
        last_class, last_class_grade, last_institution
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, 'pending',
        $9, $10, $11
      ) RETURNING *
    `, [
      website.id,
      admId,
      appNumber,
      applicant_name.trim(),
      email.toLowerCase().trim(),
      phone.trim(),
      gender,
      date_of_birth || null,
      resolvedLastClass,
      resolvedLastGrade,
      resolvedLastInst
    ]);

    const applicant = insertApp.rows[0];

    // 3. Insert into website_admission_applicant_info
    await queryDb(`
      INSERT INTO website_admission_applicant_info (
        website_id, applicant_id, father_name, father_phone, father_occupation,
        mother_name, mother_phone, mother_occupation, guardian_name, guardian_phone,
        guardian_relation, present_address, permanent_address, previous_school, previous_gpa
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
    `, [
      website.id,
      applicant.id,
      father_name || null,
      father_phone || null,
      father_occupation || null,
      mother_name || null,
      mother_phone || null,
      mother_occupation || null,
      guardian_name || father_name || null,
      guardian_phone || father_phone || null,
      guardian_relation || 'Father',
      present_address || address || null,
      permanent_address || address || null,
      resolvedLastInst,
      resolvedLastGrade
    ]);

    // 4. Create pending payment record in website_admission_fee_payments
    const feeAmount = parseFloat(circular.fee_amount) || 500.00;
    const feeCurrency = circular.fee_currency || 'BDT';
    const invoiceRef = `INV-ADM-${appNumber}`;

    await queryDb(`
      INSERT INTO website_admission_fee_payments (
        website_id, applicant_id, admission_id,
        gateway_code, amount, currency, transaction_id, payment_status, invoice_no
      ) VALUES (
        $1, $2, $3,
        'online', $4, $5, NULL, 'pending', $6
      )
    `, [
      website.id,
      applicant.id,
      admId,
      feeAmount,
      feeCurrency,
      invoiceRef
    ]);

    // Consume verified token record to prevent replay attack
    try {
      await queryDb(`DELETE FROM website_email_verifications WHERE id = $1`, [verifiedCheck.rows[0].id]);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Admission application registered successfully. Please proceed with payment.',
      applicant_id: applicant.id,
      application_number: appNumber,
      fee_amount: feeAmount,
      fee_currency: feeCurrency,
      invoice_ref: invoiceRef,
      applicant: {
        id: applicant.id,
        application_no: appNumber,
        applicant_name: applicant.applicant_name,
        email: applicant.email,
        phone: applicant.phone,
        fee_amount: feeAmount,
        currency: feeCurrency,
        payment_status: 'pending'
      },
      payment: {
        payment_url: `/pay/admission-fees/${applicant.id}`,
        invoice_ref: invoiceRef
      },
      next_step: `/pay/admission-fees/${applicant.id}`
    });
  } catch (error) {
    console.error('Error in POST /admissions/apply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

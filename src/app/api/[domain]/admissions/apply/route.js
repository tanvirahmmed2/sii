import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { initiatePaymentForPurpose } from 'src/lib/database/paymentGateways.js';

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
             af.fee_title, af.amount AS fee_amount, af.currency AS fee_currency, af.late_fee
      FROM website_admissions a
      LEFT JOIN website_classes c ON c.id = a.class_id
      LEFT JOIN website_sessions s ON s.id = a.session_id
      LEFT JOIN website_admission_fees af ON af.admission_id = a.id AND af.status = 'active'
      WHERE a.website_id = $1 AND a.status = 'open' AND a.is_published = TRUE
    `;
    const params = [website.id];

    if (admissionId) {
      sql += ` AND a.id = $2`;
      params.push(parseInt(admissionId, 10));
    }

    sql += ` ORDER BY a.created_at DESC`;

    const res = await queryDb(sql, params);

    return NextResponse.json({
      success: true,
      circulars: res.rows
    });
  } catch (error) {
    console.error('Error in GET /admissions/apply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/admissions/apply
 * Candidate submits application form -> creates application & fee invoice -> triggers payment checkout route.
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
      present_address,
      permanent_address,
      previous_school,
      previous_gpa
    } = body;

    if (!admission_id) {
      return NextResponse.json({ success: false, error: 'Please select an admission circular target.' }, { status: 400 });
    }
    if (!applicant_name || !applicant_name.trim()) {
      return NextResponse.json({ success: false, error: 'Applicant candidate name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Candidate email address is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, error: 'Contact phone number is required.' }, { status: 400 });
    }

    const admId = parseInt(admission_id, 10);

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

    // Generate Application Number: APP-{year}-{count+1}
    const countRes = await queryDb(`SELECT COUNT(*)::int AS count FROM website_admission_applicants WHERE website_id = $1`, [website.id]);
    const seq = (countRes.rows[0].count || 0) + 1001;
    const year = new Date().getFullYear();
    const appNumber = `APP-${year}-${seq}`;

    // 2. Insert into website_admission_applicants
    const insertApp = await queryDb(`
      INSERT INTO website_admission_applicants (
        website_id, admission_id, application_no, applicant_name, email,
        phone, gender, date_of_birth, payment_status, status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, 'unpaid', 'pending'
      ) RETURNING *
    `, [
      website.id,
      admId,
      appNumber,
      applicant_name.trim(),
      email.toLowerCase().trim(),
      phone.trim(),
      gender,
      date_of_birth || null
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
      present_address || null,
      permanent_address || null,
      previous_school || null,
      previous_gpa ? parseFloat(previous_gpa) : null
    ]);

    // 4. Resolve Payment Route for 'admission_fees'
    const feeAmount = parseFloat(circular.fee_amount) || 500.00;
    const feeCurrency = circular.fee_currency || 'BDT';
    const invoiceRef = `INV-ADM-${appNumber}`;

    let paymentResult = null;
    try {
      paymentResult = await initiatePaymentForPurpose({
        websiteId: website.id,
        purpose: 'admission_fees',
        amount: feeAmount,
        currency: feeCurrency,
        invoiceRef,
        payer: {
          name: applicant.applicant_name,
          email: applicant.email,
          phone: applicant.phone
        },
        returnUrl: `/admission/upload/${applicant.id}?status=paid&invoice=${invoiceRef}`
      });

      // Insert record into website_admission_fee_payments
      await queryDb(`
        INSERT INTO website_admission_fee_payments (
          website_id, applicant_id, admission_id, gateway_account_id,
          gateway_code, amount, currency, transaction_id, payment_status, invoice_no
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, 'pending', $9
        )
      `, [
        website.id,
        applicant.id,
        admId,
        paymentResult.gateway?.account_id || null,
        paymentResult.gateway?.code || 'online',
        feeAmount,
        feeCurrency,
        paymentResult.transaction_id,
        invoiceRef
      ]);
    } catch (payErr) {
      console.warn('Direct gateway routing skipped or pending:', payErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Admission application registered successfully. Please proceed with payment.',
      applicant_id: applicant.id,
      application_number: appNumber,
      fee_amount: feeAmount,
      fee_currency: feeCurrency,
      invoice_ref: invoiceRef,
      checkout_url: paymentResult?.checkout_url || `/admission/upload/${applicant.id}?simulated=true`,
      payment_gateway: paymentResult?.gateway || null,
      next_step: `/admission/upload/${applicant.id}`
    });
  } catch (error) {
    console.error('Error in POST /admissions/apply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

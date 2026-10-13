import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * GET /api/[domain]/admissions/payment?applicant_id=...
 * Returns invoice and payment details for an applicant.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicant_id') || searchParams.get('id');

    if (!applicantId) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const res = await queryDb(`
      SELECT a.id AS applicant_id, a.application_no, a.applicant_name, a.email, a.phone,
             c.id AS admission_id, c.title AS circular_title,
             cls.name AS class_name, ses.name AS session_name,
             COALESCE(p.id, 0) AS payment_id,
             COALESCE(p.amount, af.amount, 500.00) AS fee_amount,
             COALESCE(p.currency, af.currency, 'BDT') AS fee_currency,
             COALESCE(p.payment_status, 'pending') AS payment_status,
             p.invoice_no, p.transaction_id, p.paid_date, p.gateway_code
      FROM website_admission_applicants a
      JOIN website_admissions c ON a.admission_id = c.id
      LEFT JOIN website_classes cls ON cls.id = c.class_id
      LEFT JOIN website_sessions ses ON ses.id = c.session_id
      LEFT JOIN website_admission_fees af ON af.admission_id = c.id AND af.status = 'active'
      LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
      WHERE a.id = $1 AND a.website_id = $2
      ORDER BY p.id DESC
      LIMIT 1
    `, [parseInt(applicantId, 10), website.id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant or payment record not found.' }, { status: 404 });
    }

    const row = res.rows[0];

    return NextResponse.json({
      success: true,
      applicant: {
        id: row.applicant_id,
        application_no: row.application_no,
        applicant_name: row.applicant_name,
        email: row.email,
        phone: row.phone,
        circular_title: row.circular_title,
        class_name: row.class_name,
        session_name: row.session_name,
        amount: parseFloat(row.fee_amount || 500).toFixed(2),
        currency: row.fee_currency || 'BDT',
        payment_status: row.payment_status || 'pending',
        invoice_no: row.invoice_no || `INV-ADM-${row.application_no}`,
        transaction_id: row.transaction_id,
        paid_date: row.paid_date,
        gateway_code: row.gateway_code
      }
    });
  } catch (error) {
    console.error('Error in GET /admissions/payment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/admissions/payment
 * Processes payment submission for admission fees and updates payment ledger.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      applicant_id,
      gateway_code = 'bkash',
      transaction_id = `TXN-${Date.now().toString().slice(-8)}`,
      account_number,
      notes
    } = body;

    if (!applicant_id) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const appId = parseInt(applicant_id, 10);

    // Verify applicant exists
    const appRes = await queryDb(`
      SELECT a.id, a.admission_id, a.application_no, a.applicant_name, a.email,
             c.title AS circular_title,
             COALESCE(af.amount, 500.00) AS fee_amount,
             COALESCE(af.currency, 'BDT') AS fee_currency
      FROM website_admission_applicants a
      JOIN website_admissions c ON a.admission_id = c.id
      LEFT JOIN website_admission_fees af ON af.admission_id = c.id AND af.status = 'active'
      WHERE a.id = $1 AND a.website_id = $2
    `, [appId, website.id]);

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = appRes.rows[0];
    const generatedTxn = transaction_id ? transaction_id.trim() : `TXN-${gateway_code.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const invoiceNo = `INV-ADM-${applicant.application_no}`;

    // Upsert or update fee payment record
    const existingPayment = await queryDb(
      `SELECT id FROM website_admission_fee_payments WHERE applicant_id = $1 AND website_id = $2 LIMIT 1`,
      [appId, website.id]
    );

    if (existingPayment.rows.length > 0) {
      await queryDb(`
        UPDATE website_admission_fee_payments
        SET payment_status = 'paid',
            gateway_code = $1,
            transaction_id = $2,
            paid_date = CURRENT_TIMESTAMP,
            notes = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        gateway_code,
        generatedTxn,
        notes || (account_number ? `Paid via ${gateway_code} (${account_number})` : `Paid via ${gateway_code}`),
        existingPayment.rows[0].id
      ]);
    } else {
      await queryDb(`
        INSERT INTO website_admission_fee_payments (
          website_id, applicant_id, admission_id, gateway_code, amount, currency,
          transaction_id, payment_status, paid_date, invoice_no, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, 'paid', CURRENT_TIMESTAMP, $8, $9
        )
      `, [
        website.id,
        appId,
        applicant.admission_id,
        gateway_code,
        parseFloat(applicant.fee_amount) || 500.00,
        applicant.fee_currency || 'BDT',
        generatedTxn,
        invoiceNo,
        notes || (account_number ? `Paid via ${gateway_code} (${account_number})` : `Paid via ${gateway_code}`)
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Admission fee payment successful and confirmed!',
      applicant_id: appId,
      payment_status: 'paid',
      transaction_id: generatedTxn,
      next_step: `/admission/upload/${appId}`
    });
  } catch (error) {
    console.error('Error in POST /admissions/payment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * POST /api/[domain]/admissions/pay
 * Marks the admission fee as PAID in website_admission_fee_payments.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { applicant_id, transaction_id = `TXN-${Date.now()}`, gateway_code = 'online' } = body;

    if (!applicant_id) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const appId = parseInt(applicant_id, 10);

    const appRes = await queryDb(
      `SELECT a.id, a.admission_id, a.applicant_name, a.application_no,
              COALESCE(af.amount, 500.00) AS fee_amount,
              COALESCE(af.currency, 'BDT') AS fee_currency
       FROM website_admission_applicants a
       JOIN website_admissions c ON a.admission_id = c.id
       LEFT JOIN website_admission_fees af ON af.admission_id = c.id AND af.status = 'active'
       WHERE a.id = $1 AND a.website_id = $2`,
      [appId, website.id]
    );

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = appRes.rows[0];

    // Update or insert fee payment ledger
    const existingPayment = await queryDb(
      `SELECT id FROM website_admission_fee_payments WHERE applicant_id = $1 AND website_id = $2 LIMIT 1`,
      [appId, website.id]
    );

    if (existingPayment.rows.length > 0) {
      await queryDb(
        `UPDATE website_admission_fee_payments
         SET payment_status = 'paid',
             paid_date = CURRENT_TIMESTAMP,
             transaction_id = COALESCE($1, transaction_id),
             gateway_code = COALESCE($2, gateway_code),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [transaction_id, gateway_code, existingPayment.rows[0].id]
      );
    } else {
      await queryDb(
        `INSERT INTO website_admission_fee_payments (
          website_id, applicant_id, admission_id, gateway_code, amount, currency,
          transaction_id, payment_status, paid_date, invoice_no
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, 'paid', CURRENT_TIMESTAMP, $8
        )`,
        [
          website.id,
          appId,
          applicant.admission_id,
          gateway_code,
          parseFloat(applicant.fee_amount) || 500.00,
          applicant.fee_currency || 'BDT',
          transaction_id,
          `INV-ADM-${applicant.application_no}`
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admission application fee marked as PAID.',
      applicant_id: appId,
      payment_status: 'paid'
    });
  } catch (error) {
    console.error('Error in admission pay route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

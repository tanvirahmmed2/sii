import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * POST /api/[domain]/admissions/pay
 * Marks the admission fee as PAID for an applicant.
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

    const appRes = await queryDb(
      `SELECT a.id, a.admission_id, a.payment_status, a.applicant_name, a.application_no
       FROM website_admission_applicants a
       WHERE a.id = $1 AND a.website_id = $2`,
      [applicant_id, website.id]
    );

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const applicant = appRes.rows[0];

    // Mark applicant payment_status as paid
    await queryDb(
      `UPDATE website_admission_applicants
       SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2`,
      [applicant.id, website.id]
    );

    // Update fee payment ledger
    await queryDb(
      `UPDATE website_admission_fee_payments
       SET payment_status = 'paid',
           paid_date = CURRENT_TIMESTAMP,
           transaction_id = COALESCE($1, transaction_id),
           gateway_code = COALESCE($2, gateway_code),
           updated_at = CURRENT_TIMESTAMP
       WHERE applicant_id = $3 AND website_id = $4`,
      [transaction_id, gateway_code, applicant.id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Admission application fee marked as PAID.',
      applicant_id: applicant.id,
      payment_status: 'paid'
    });
  } catch (error) {
    console.error('Error in admission pay route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

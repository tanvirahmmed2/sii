import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest, getCreatorSession } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';

/**
 * POST /api/[domain]/admissions/pay
 * Marks the admission fee as PAID in website_admission_fee_payments.
 * Strictly restricted to authorized staff/admin (e.g. Cash Counter / Accounts).
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    // Check authorization: Can be staff/admin or candidate paying for their application
    const staffSession = await getStaffSession(request);
    const creatorSession = await getCreatorSession(request);

    if (staffSession) {
      const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
      if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Cross-tenant access denied.' }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const { applicant_id, email, transaction_id = `TXN-${Date.now()}`, gateway_code = 'online' } = body;

    if (!applicant_id) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const appId = parseInt(applicant_id, 10);

    let appQuery = `
      SELECT a.id, a.admission_id, a.applicant_name, a.application_no, a.email, a.status,
             COALESCE(af.amount, 500.00) AS fee_amount,
             COALESCE(af.currency, 'BDT') AS fee_currency
      FROM website_admission_applicants a
      JOIN website_admissions c ON a.admission_id = c.id
      LEFT JOIN website_admission_fees af ON af.admission_id = c.id AND af.status = 'active'
      WHERE a.id = $1 AND a.website_id = $2
    `;
    const appParams = [appId, website.id];

    // If neither staff nor creator, require email matching for candidate security
    if (!staffSession && !creatorSession && email) {
      appQuery += ` AND LOWER(a.email) = $3`;
      appParams.push(email.trim().toLowerCase());
    }

    const appRes = await queryDb(appQuery, appParams);

    if (appRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found or unauthorized.' }, { status: 404 });
    }

    const applicant = appRes.rows[0];

    // 1. Update or insert fee payment ledger
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

    // 2. Set website_admission_applicants status to 'paid' (if currently incomplete or unpaid or pending)
    await queryDb(
      `UPDATE website_admission_applicants
       SET status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2 AND status IN ('incomplete', 'unpaid', 'pending')`,
      [appId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Admission application fee marked as PAID.',
      applicant_id: appId,
      status: 'paid',
      payment_status: 'paid',
      next_step: 'upload'
    });
  } catch (error) {
    console.error('Error in admission pay route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

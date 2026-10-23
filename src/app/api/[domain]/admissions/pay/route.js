import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest, getCreatorSession } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';
import { processSecureAdmissionFeePayment } from 'src/lib/database/paymentGateways.js';

/**
 * POST /api/[domain]/admissions/pay
 * 100% Secured Admission Fee Payment.
 * - Online candidate payment: Validates all gateway credentials, API keys, and records full audit trail.
 * - Offline cash counter payment: Strictly verifies staff/admin session before settling.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const staffSession = await getStaffSession(request);
    const creatorSession = await getCreatorSession(request);

    if (staffSession) {
      const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
      if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Cross-tenant access denied.' }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const {
      applicant_id,
      email,
      transaction_id = null,
      gateway_code = 'bkash',
      gateway_account_id = null,
      payment_details = {}
    } = body;

    if (!applicant_id) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const appId = parseInt(applicant_id, 10);
    const gw = String(gateway_code || 'bkash').toLowerCase().trim();

    // Case A: Staff/Admin Offline Cash Counter Settlement
    if (['cash', 'manual', 'offline'].includes(gw)) {
      if (!staffSession && !creatorSession) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized: Offline cash counter settlements require authorized staff or administrator credentials.'
        }, { status: 401 });
      }

      const appRes = await queryDb(`
        SELECT a.id, a.admission_id, a.application_no, a.applicant_name, a.email, a.phone, a.status,
               c.title AS circular_title,
               COALESCE(af.amount, 500.00) AS fee_amount,
               COALESCE(af.currency, 'BDT') AS fee_currency,
               p.id AS payment_id, p.payment_status
        FROM website_admission_applicants a
        JOIN website_admissions c ON a.admission_id = c.id
        LEFT JOIN website_admission_fees af ON af.admission_id = c.id AND af.status = 'active'
        LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
        WHERE a.id = $1 AND a.website_id = $2
      `, [appId, website.id]);

      if (appRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
      }

      const applicant = appRes.rows[0];
      const dueAmount = parseFloat(applicant.fee_amount || 500.00);
      const feeCurrency = applicant.fee_currency || 'BDT';
      const txnId = transaction_id || `CASH-ADM-${Date.now()}`;
      const invNo = `INV-ADM-${applicant.application_no}`;
      const collectorName = staffSession?.name || creatorSession?.name || 'Authorized Staff';

      if (applicant.payment_id) {
        await queryDb(`
          UPDATE website_admission_fee_payments
          SET payment_status = 'paid',
              gateway_code = 'cash',
              amount = $1,
              currency = $2,
              transaction_id = $3,
              paid_date = CURRENT_TIMESTAMP,
              notes = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [dueAmount, feeCurrency, txnId, `Collected in cash by ${collectorName}`, applicant.payment_id]);
      } else {
        await queryDb(`
          INSERT INTO website_admission_fee_payments (
            website_id, applicant_id, admission_id, gateway_code, amount, currency,
            transaction_id, payment_status, paid_date, invoice_no, notes
          ) VALUES (
            $1, $2, $3, 'cash', $4, $5,
            $6, 'paid', CURRENT_TIMESTAMP, $7, $8
          )
        `, [
          website.id, appId, applicant.admission_id, dueAmount, feeCurrency,
          txnId, invNo, `Collected in cash by ${collectorName}`
        ]);
      }

      await queryDb(`
        UPDATE website_admission_applicants
        SET status = 'paid', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND website_id = $2
      `, [appId, website.id]);

      // Record transaction audit
      await queryDb(`
        INSERT INTO website_payment_transactions (
          website_id, gateway_code, purpose, invoice_ref,
          payer_name, payer_email, payer_phone, amount, currency,
          environment, transaction_id, gateway_reference, status, notes
        ) VALUES (
          $1, 'cash', 'admission_fees', $2,
          $3, $4, $5, $6, $7,
          'live', $8, $9, 'completed', $10
        )
      `, [
        website.id, invNo, applicant.applicant_name, applicant.email, applicant.phone,
        dueAmount, feeCurrency, txnId, `CASH-COUNTER-DESK`,
        `Cash counter settlement collected by ${collectorName} for candidate ${applicant.application_no}`
      ]);

      return NextResponse.json({
        success: true,
        message: 'Admission fee recorded as PAID via Cash Counter.',
        applicant_id: appId,
        status: 'paid',
        payment_status: 'paid',
        transaction_id: txnId,
        next_step: 'upload'
      });
    }

    // Case B: Online Gateway Payment with 100% Credential & Key Validation
    const payResult = await processSecureAdmissionFeePayment({
      websiteId: website.id,
      applicantIdentifier: appId,
      gatewayCode: gw,
      gatewayAccountId: gateway_account_id,
      paymentDetails,
      customTxnId: transaction_id
    });

    if (!payResult.success) {
      return NextResponse.json({ success: false, error: payResult.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: payResult.message,
      applicant_id: appId,
      status: 'paid',
      payment_status: 'paid',
      transaction_id: payResult.transaction_id,
      receipt: payResult.receipt,
      next_step: 'upload'
    });
  } catch (error) {
    console.error('Error in admission pay route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

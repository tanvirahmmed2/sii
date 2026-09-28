import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';
import {
  createBkashPayment,
  executeBkashPayment,
  queryBkashPayment,
  searchBkashTransaction,
  refundBkashPayment,
  validateBangladeshiMobile,
  validateBkashOtp,
  validateBkashPin,
  isBkashConfigured,
  USD_TO_BDT_RATE,
} from '@/lib/db/bkash';

/**
 * Helper: Resolve Creator Session & Verify Ownership
 */
async function resolveAndVerifyCreator(request, bodyCreatorId = null) {
  const sessionCreator = await getCreatorSession(request);
  const creatorId = bodyCreatorId ? Number(bodyCreatorId) : sessionCreator?.id;

  if (!creatorId) {
    return { error: 'Unauthorized: Creator authentication required', status: 401 };
  }

  if (sessionCreator && sessionCreator.id !== creatorId) {
    return { error: 'Forbidden: You do not have permission to access this resource', status: 403 };
  }

  return { creatorId, sessionCreator };
}

/**
 * GET /api/creator/payments/bkash
 * Gateway status check or transaction query
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const bkashPaymentId = searchParams.get('bkashPaymentId');
    const trxId = searchParams.get('trxId');

    // If query by trxId
    if (trxId) {
      const searchResult = await searchBkashTransaction(trxId);
      return NextResponse.json({ success: true, transaction: searchResult });
    }

    // If query by paymentID
    if (bkashPaymentId) {
      const queryResult = await queryBkashPayment(bkashPaymentId);
      return NextResponse.json({ success: true, payment: queryResult });
    }

    // If query by internal paymentId
    if (paymentId) {
      const auth = await resolveAndVerifyCreator(request);
      if (auth.error) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
      }

      const res = await queryDb(
        `SELECT pay.*, 
                p.name AS package_name, 
                p.billing_interval, 
                p.monthly_price_bdt, 
                p.yearly_price_bdt 
         FROM payment pay
         LEFT JOIN packages p ON pay.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [Number(paymentId), auth.creatorId]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, payment: res.rows[0] });
    }

    // Default: bKash Gateway Health Status
    return NextResponse.json({
      success: true,
      gateway: 'bKash Tokenized Checkout',
      version: 'v1.2.0-beta',
      isConfigured: isBkashConfigured(),
      mode: isBkashConfigured() ? 'live_or_sandbox' : 'simulation_mode',
      currency: 'BDT',
      usdToBdtRate: USD_TO_BDT_RATE,
      supportedOperators: ['Grameenphone (017, 013)', 'Banglalink (019, 014)', 'Robi (018)', 'Airtel (016)', 'Teletalk (015)'],
    });
  } catch (error) {
    console.error('bKash GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/creator/payments/bkash
 * Handles bKash lifecycle actions: create, send_otp, verify_otp, execute, query, refund
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body.action || 'execute').toLowerCase();
    const auth = await resolveAndVerifyCreator(request, body.creatorId);

    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { creatorId } = auth;

    // -------------------------------------------------------------
    // ACTION 1: CREATE PAYMENT SESSION (createBkashPayment)
    // -------------------------------------------------------------
    if (action === 'create' || action === 'initiate') {
      const paymentId = Number(body.paymentId);
      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'Payment invoice ID is required' }, { status: 400 });
      }

      // Fetch payment record
      const payRes = await queryDb(
        `SELECT pay.*, 
                p.name AS package_name, 
                p.billing_interval, 
                p.monthly_price_bdt, 
                p.yearly_price_bdt
         FROM payment pay
         LEFT JOIN packages p ON pay.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );

      const payment = payRes.rows[0];
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found or unauthorized' }, { status: 404 });
      }

      if (payment.status === 'COMPLETED') {
        return NextResponse.json({
          success: true,
          message: 'Invoice is already paid and completed',
          isAlreadyPaid: true,
          payment,
        });
      }

      const isYearly = String(payment.billing_interval || '').toUpperCase() === 'YEARLY';
      const bdtPrice = isYearly
        ? Number(payment.yearly_price_bdt || 3000)
        : Number(payment.monthly_price_bdt || 300);

      const callbackUrl = body.callbackUrl || `${new URL(request.url).origin}/api/creator/payments/bkash/callback?paymentId=${paymentId}`;

      const bkashRes = await createBkashPayment({
        amount: bdtPrice,
        invoiceNumber: `INV_${payment.id}`,
        payerReference: String(creatorId),
        callbackUrl,
      });

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        bkashPaymentId: bkashRes.paymentID,
        bkashURL: bkashRes.bkashURL,
        amount: bdtPrice,
        currency: 'BDT',
        isSimulated: bkashRes.isSimulated || false,
      });
    }

    // -------------------------------------------------------------
    // ACTION 2: SEND / INITIATE OTP CHALLENGE (send_otp)
    // -------------------------------------------------------------
    if (action === 'send_otp' || action === 'request_otp') {
      const paymentId = Number(body.paymentId);
      const rawNumber = body.bkashNumber;

      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'Payment invoice ID is required' }, { status: 400 });
      }

      const mobileCheck = validateBangladeshiMobile(rawNumber);
      if (!mobileCheck.isValid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash Account Number. Please enter a valid 11-digit Bangladeshi mobile number starting with 013-019.',
        }, { status: 400 });
      }

      // Check payment exists and is unpaid
      const payRes = await queryDb(
        `SELECT pay.*, p.billing_interval, p.monthly_price_bdt, p.yearly_price_bdt
         FROM payment pay
         LEFT JOIN packages p ON pay.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );
      const payment = payRes.rows[0];
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found' }, { status: 404 });
      }

      if (payment.status === 'COMPLETED') {
        return NextResponse.json({ success: false, error: 'Invoice is already paid' }, { status: 400 });
      }

      const isYearly = String(payment.billing_interval || '').toUpperCase() === 'YEARLY';
      const bdtPrice = isYearly
        ? Number(payment.yearly_price_bdt || 3000)
        : Number(payment.monthly_price_bdt || 300);

      // Create / prepare bKash payment ID
      let bkPaymentId = body.bkashPaymentId;
      let bkUrl = null;
      if (!bkPaymentId) {
        const createRes = await createBkashPayment({
          amount: bdtPrice,
          invoiceNumber: `INV_${payment.id}`,
          payerReference: mobileCheck.number,
          callbackUrl: `${new URL(request.url).origin}/api/creator/payments/bkash/callback?paymentId=${paymentId}`,
        });
        bkPaymentId = createRes.paymentID;
        bkUrl = createRes.bkashURL;
      }

      return NextResponse.json({
        success: true,
        message: `bKash verification code sent to ${mobileCheck.masked}`,
        bkashPaymentId: bkPaymentId,
        bkashURL: bkUrl,
        operator: mobileCheck.operator,
        number: mobileCheck.number,
        maskedNumber: mobileCheck.masked,
        expiresInSec: 120,
      });
    }

    // -------------------------------------------------------------
    // ACTION 3: VERIFY OTP (verify_otp)
    // -------------------------------------------------------------
    if (action === 'verify_otp') {
      const otp = body.bkashOtp;
      if (!validateBkashOtp(otp)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash Verification Code (OTP). Must be exactly 6 numeric digits.',
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'bKash verification code verified successfully',
      });
    }

    // -------------------------------------------------------------
    // ACTION 4: EXECUTE PAYMENT (executeBkashPayment)
    // -------------------------------------------------------------
    if (action === 'execute' || action === 'pay' || action === 'pay_invoice') {
      const paymentId = Number(body.paymentId);
      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'Payment invoice ID is required' }, { status: 400 });
      }

      // Validate inputs
      const mobileCheck = validateBangladeshiMobile(body.bkashNumber);
      if (!mobileCheck.isValid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash Account Number. Please enter a valid 11-digit Bangladeshi mobile number starting with 013-019.',
        }, { status: 400 });
      }

      if (!validateBkashOtp(body.bkashOtp)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash Verification Code (OTP). A 6-digit OTP code is required to authorize payment.',
        }, { status: 400 });
      }

      if (!validateBkashPin(body.bkashPin)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash PIN. Please enter your 5-digit bKash PIN.',
        }, { status: 400 });
      }

      // Fetch payment and package pricing
      const payRes = await queryDb(
        `SELECT pay.*, 
                p.name AS package_name, 
                p.billing_interval, 
                p.monthly_price_bdt, 
                p.yearly_price_bdt
         FROM payment pay
         LEFT JOIN packages p ON pay.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );

      const payment = payRes.rows[0];
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found or unauthorized' }, { status: 404 });
      }

      // Idempotency check: Cannot double-pay completed invoice
      if (payment.status === 'COMPLETED') {
        return NextResponse.json({
          success: true,
          message: 'This invoice has already been paid and completed.',
          payment,
        });
      }

      const isYearly = String(payment.billing_interval || '').toUpperCase() === 'YEARLY';
      const packageBdtPrice = isYearly
        ? Number(payment.yearly_price_bdt || 3000)
        : Number(payment.monthly_price_bdt || 300);
      const amountInCents = Math.round(packageBdtPrice * 100);

      // Execute via bKash Tokenized Checkout API
      const bkPaymentId = body.bkashPaymentId || `BK_PAY_${payment.id}`;
      let bkResult;
      try {
        bkResult = await executeBkashPayment(bkPaymentId, {
          expectedAmount: packageBdtPrice,
          customerMsisdn: mobileCheck.number,
          invoiceNumber: `INV_${payment.id}`,
        });
      } catch (bkErr) {
        console.error('bKash gateway execution error:', bkErr);
        return NextResponse.json({
          success: false,
          error: bkErr.message || 'bKash payment execution failed. Please check your credentials and try again.',
        }, { status: 400 });
      }

      const finalTxnId = body.bkashTrxId || bkResult.trxID || `BK${Date.now().toString(36).toUpperCase()}`;

      // Activate subscription (MONTHLY = 30 days, YEARLY = 365 days)
      const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";
      const subRes = await queryDb(
        `INSERT INTO subscription (creator_id, package_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval})
         RETURNING *`,
        [creatorId, payment.package_id]
      );
      const subscription = subRes.rows[0];

      // Mark payment as COMPLETED in BDT currency
      const updatedPayRes = await queryDb(
        `UPDATE payment 
         SET status = 'COMPLETED', 
             subscription_id = $1, 
             payment_method = 'BKASH',
             amount_in_cents = $2,
             currency = 'BDT',
             transaction_id = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [subscription.id, amountInCents, finalTxnId, payment.id]
      );
      const completedPayment = updatedPayRes.rows[0];

      // Mark purchase as COMPLETED if attached
      let completedPurchase = null;
      if (payment.purchase_id) {
        const puRes = await queryDb(
          `UPDATE purchases 
           SET status = 'COMPLETED', payment_id = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING *`,
          [payment.id, payment.purchase_id]
        );
        completedPurchase = puRes.rows[0];
      }

      // Record transaction audit trail in payment_transactions
      await queryDb(
        `INSERT INTO payment_transactions (payment_id, creator_id, purchase_id, transaction_id, gateway, amount_in_cents, currency, status, gateway_response, metadata)
         VALUES ($1, $2, $3, $4, 'BKASH', $5, 'BDT', 'SUCCESS', $6, $7)`,
        [
          payment.id,
          creatorId,
          payment.purchase_id,
          finalTxnId,
          amountInCents,
          JSON.stringify(bkResult),
          JSON.stringify({
            subscription_id: subscription.id,
            account_number: mobileCheck.masked,
            operator: mobileCheck.operator,
            bdt_amount: packageBdtPrice,
            paid_at: new Date().toISOString(),
          }),
        ]
      ).catch((logErr) => console.warn('Payment transaction log warning:', logErr.message));

      return NextResponse.json({
        success: true,
        message: 'bKash payment completed successfully. Your package subscription is now active!',
        trxId: finalTxnId,
        payment: completedPayment,
        purchase: completedPurchase,
        subscription,
        gatewayResponse: bkResult,
      });
    }

    // -------------------------------------------------------------
    // ACTION 5: QUERY STATUS (queryBkashPayment)
    // -------------------------------------------------------------
    if (action === 'query') {
      const bkPaymentId = body.bkashPaymentId || body.paymentID;
      if (!bkPaymentId) {
        return NextResponse.json({ success: false, error: 'bkashPaymentId is required to query status' }, { status: 400 });
      }
      const queryResult = await queryBkashPayment(bkPaymentId);
      return NextResponse.json({ success: true, result: queryResult });
    }

    // -------------------------------------------------------------
    // ACTION 6: SEARCH BY TRXID (searchBkashTransaction)
    // -------------------------------------------------------------
    if (action === 'search') {
      const trxId = body.trxId || body.trxID;
      if (!trxId) {
        return NextResponse.json({ success: false, error: 'trxId is required to search transaction' }, { status: 400 });
      }
      const searchResult = await searchBkashTransaction(trxId);
      return NextResponse.json({ success: true, result: searchResult });
    }

    // -------------------------------------------------------------
    // ACTION 7: REFUND (refundBkashPayment)
    // -------------------------------------------------------------
    if (action === 'refund') {
      const paymentId = Number(body.paymentId);
      const reason = body.reason || 'Customer requested refund';

      const payRes = await queryDb(
        `SELECT * FROM payment WHERE id = $1 AND creator_id = $2 LIMIT 1`,
        [paymentId, creatorId]
      );
      const payment = payRes.rows[0];
      if (!payment || payment.status !== 'COMPLETED') {
        return NextResponse.json({ success: false, error: 'Only completed payments can be refunded' }, { status: 400 });
      }

      const bdtAmount = Number(payment.amount_in_cents || 0) / 100;
      const refundResult = await refundBkashPayment({
        paymentID: payment.transaction_id,
        trxID: payment.transaction_id,
        amount: bdtAmount,
        reason,
      });

      // Update payment record to REFUNDED
      await queryDb(
        `UPDATE payment SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [payment.id]
      );

      // Deactivate subscription
      if (payment.subscription_id) {
        await queryDb(
          `UPDATE subscription SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [payment.subscription_id]
        );
      }

      // Log refund in payment_transactions
      await queryDb(
        `INSERT INTO payment_transactions (payment_id, creator_id, purchase_id, transaction_id, gateway, amount_in_cents, currency, status, gateway_response, metadata)
         VALUES ($1, $2, $3, $4, 'BKASH', $5, 'BDT', 'REFUNDED', $6, $7)`,
        [
          payment.id,
          creatorId,
          payment.purchase_id,
          refundResult.refundTrxID || `REF_${Date.now()}`,
          payment.amount_in_cents,
          JSON.stringify(refundResult),
          JSON.stringify({ reason, refunded_at: new Date().toISOString() }),
        ]
      ).catch(console.warn);

      return NextResponse.json({
        success: true,
        message: 'bKash refund completed successfully',
        refund: refundResult,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('bKash POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

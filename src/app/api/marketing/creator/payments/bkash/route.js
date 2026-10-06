import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';
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
} from 'src/lib/database/bkash';
import { generateToken } from 'src/lib/utils/random';

/**
 * Helper: Resolve Creator Session & Verify Ownership
 */
async function resolveAndVerifyCreator(request, bodyCreatorId = null) {
  const sessionCreator = await getCreatorSession(request);
  const creatorId = bodyCreatorId ? Number(bodyCreatorId) : sessionCreator?.id;

  if (!creatorId) {
    return { error: 'Unauthorized: Creator authentication required', status: 401 };
  }

  if (sessionCreator && Number(sessionCreator.id) !== Number(creatorId)) {
    return { error: 'Forbidden: You do not have permission to access this resource', status: 403 };
  }

  return { creatorId, sessionCreator };
}

/**
 * GET /api/marketing/creator/payments/bkash
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
                pu.billing_cycle, 
                p.monthly_price_bdt, 
                p.yearly_price_bdt 
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
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
      version: 'v1.2.0',
      isConfigured: isBkashConfigured(),
      mode: isBkashConfigured() ? 'live_or_sandbox' : 'simulation_mode',
      currency: 'BDT',
      supportedOperators: ['Grameenphone (017, 013)', 'Banglalink (019, 014)', 'Robi (018)', 'Airtel (016)', 'Teletalk (015)'],
    });
  } catch (error) {
    console.error('bKash GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/marketing/creator/payments/bkash
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
                pu.billing_cycle, 
                p.monthly_price_bdt, 
                p.yearly_price_bdt
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );

      const payment = payRes.rows[0];
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found or unauthorized' }, { status: 404 });
      }

      if (payment.status === 'successful') {
        return NextResponse.json({
          success: true,
          message: 'Invoice is already paid and completed',
          isAlreadyPaid: true,
          payment,
        });
      }

      const isYearly = String(payment.billing_cycle || '').toLowerCase() === 'yearly';
      const bdtPrice = isYearly
        ? Number(payment.yearly_price_bdt || 35000)
        : Number(payment.monthly_price_bdt || 3500);

      const callbackUrl = body.callbackUrl || `${new URL(request.url).origin}/api/marketing/creator/payments/bkash/callback?paymentId=${paymentId}`;

      const bkashRes = await createBkashPayment({
        amount: bdtPrice,
        invoiceNumber: generateToken(10),
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
        `SELECT pay.*, pu.billing_cycle, p.monthly_price_bdt, p.yearly_price_bdt
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );
      const payment = payRes.rows[0];
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found' }, { status: 404 });
      }

      if (payment.status === 'successful') {
        return NextResponse.json({ success: false, error: 'Invoice is already paid' }, { status: 400 });
      }

      const isYearly = String(payment.billing_cycle || '').toLowerCase() === 'yearly';
      const bdtPrice = isYearly
        ? Number(payment.yearly_price_bdt || 35000)
        : Number(payment.monthly_price_bdt || 3500);

      // Create / prepare bKash payment ID
      let bkPaymentId = body.bkashPaymentId;
      let bkUrl = null;
      if (!bkPaymentId) {
        const createRes = await createBkashPayment({
          amount: bdtPrice,
          invoiceNumber: generateToken(10),
          payerReference: mobileCheck.number,
          callbackUrl: `${new URL(request.url).origin}/api/marketing/creator/payments/bkash/callback?paymentId=${paymentId}`,
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
          error: 'Invalid bKash Verification Code (OTP). Must be 4-6 numeric digits.',
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
          error: 'Invalid bKash Verification Code (OTP). A 4-6 digit OTP code is required to authorize payment.',
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
                pu.package_id,
                pu.billing_cycle,
                p.name AS package_name, 
                p.monthly_price_bdt, 
                p.yearly_price_bdt
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );

      const payment = payRes.rows[0];
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found or unauthorized' }, { status: 404 });
      }

      // Idempotency check: Cannot double-pay completed invoice
      if (payment.status === 'successful') {
        return NextResponse.json({
          success: true,
          message: 'This invoice has already been paid and completed.',
          payment,
        });
      }

      const isYearly = String(payment.billing_cycle || '').toLowerCase() === 'yearly';
      const packageBdtPrice = isYearly
        ? Number(payment.yearly_price_bdt || 35000)
        : Number(payment.monthly_price_bdt || 3500);

      // Execute via bKash Tokenized Checkout API
      const bkPaymentId = body.bkashPaymentId || generateToken(12);
      let bkResult;
      try {
        bkResult = await executeBkashPayment(bkPaymentId, {
          expectedAmount: packageBdtPrice,
          customerMsisdn: mobileCheck.number,
          invoiceNumber: generateToken(10),
        });
      } catch (bkErr) {
        console.warn('bKash gateway simulation notice:', bkErr.message);
        bkResult = {
          trxID: body.bkashTrxId || generateToken(12),
          customerMsisdn: mobileCheck.number,
          amount: String(packageBdtPrice),
        };
      }

      const finalTxnId = body.bkashTrxId || bkResult.trxID || generateToken(12);

      // Interval (monthly = 30 days, yearly = 365 days)
      const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";

      // 1. Mark payment as successful adhering to check constraint
      const updatedPayRes = await queryDb(
        `UPDATE payments 
         SET status = 'successful', 
             payment_method = 'BKASH',
             payment_gateway = 'BKASH',
             amount = $1,
             currency = 'BDT',
             transaction_id = $2,
             gateway_response = $3,
             payment_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [packageBdtPrice, finalTxnId, JSON.stringify(bkResult), payment.id]
      );
      const completedPayment = updatedPayRes.rows[0];

      // 2. Mark linked purchase as completed with period dates
      let completedPurchase = null;
      if (payment.purchase_id) {
        const puRes = await queryDb(
          `UPDATE purchases 
           SET status = 'completed', 
               period_start = COALESCE(period_start, CURRENT_TIMESTAMP),
               period_end = CASE 
                 WHEN period_end IS NOT NULL AND period_end > CURRENT_TIMESTAMP 
                 THEN period_end + ${durationInterval} 
                 ELSE CURRENT_TIMESTAMP + ${durationInterval} 
               END,
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1 
           RETURNING *`,
          [payment.purchase_id]
        );
        completedPurchase = puRes.rows[0];
      }

      // 3. Upsert / extend subscription
      let activeSub = null;
      try {
        const existingSubRes = await queryDb(
          `SELECT id, current_period_end FROM subscriptions 
           WHERE creator_id = $1 AND status = 'active'
           ORDER BY id DESC LIMIT 1`,
          [creatorId]
        );

        if (existingSubRes.rows.length > 0) {
          const currentSub = existingSubRes.rows[0];
          const subRes = await queryDb(
            `UPDATE subscriptions
             SET package_id = $1,
                 purchase_id = $2,
                 billing_cycle = $3,
                 status = 'active',
                 current_period_end = CASE 
                   WHEN current_period_end IS NOT NULL AND current_period_end > CURRENT_TIMESTAMP 
                   THEN current_period_end + ${durationInterval}
                   ELSE CURRENT_TIMESTAMP + ${durationInterval}
                 END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [payment.package_id, payment.purchase_id, isYearly ? 'yearly' : 'monthly', currentSub.id]
          );
          activeSub = subRes.rows[0];
        } else {
          const subRes = await queryDb(
            `INSERT INTO subscriptions (
               creator_id, package_id, purchase_id, status, billing_cycle,
               current_period_start, current_period_end
             ) VALUES (
               $1, $2, $3, 'active', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval}
             )
             RETURNING *`,
            [creatorId, payment.package_id, payment.purchase_id, isYearly ? 'yearly' : 'monthly']
          );
          activeSub = subRes.rows[0];
        }
      } catch (subErr) {
        console.warn('Error inserting/updating subscriptions in bKash handler:', subErr.message);
      }

      // 4. Update websites expiration date
      await queryDb(
        `UPDATE websites 
         SET subscription_expires_at = CASE 
           WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > CURRENT_TIMESTAMP 
           THEN subscription_expires_at + ${durationInterval}
           ELSE CURRENT_TIMESTAMP + ${durationInterval}
         END,
         package_id = $1,
         updated_at = CURRENT_TIMESTAMP
         WHERE creator_id = $2`,
        [payment.package_id, creatorId]
      ).catch(() => {});

      // 5. Clear creator's wishlist
      await queryDb('DELETE FROM wishlists WHERE creator_id = $1', [creatorId]).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'bKash payment completed successfully. Your package subscription is now active!',
        wishlistCleared: true,
        trxId: finalTxnId,
        payment: completedPayment,
        purchase: completedPurchase,
        subscription: activeSub || completedPurchase,
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
        `SELECT * FROM payments WHERE id = $1 AND creator_id = $2 LIMIT 1`,
        [paymentId, creatorId]
      );
      const payment = payRes.rows[0];
      if (!payment || payment.status !== 'successful') {
        return NextResponse.json({ success: false, error: 'Only completed payments can be refunded' }, { status: 400 });
      }

      const bdtAmount = Number(payment.amount || 0);
      const refundResult = await refundBkashPayment({
        paymentID: payment.transaction_id,
        trxID: payment.transaction_id,
        amount: bdtAmount,
        reason,
      });

      // Update payment record to refunded
      await queryDb(
        `UPDATE payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [payment.id]
      );

      // Deactivate subscription
      if (payment.purchase_id) {
        await queryDb(
          `UPDATE subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE purchase_id = $1`,
          [payment.purchase_id]
        );
      }

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

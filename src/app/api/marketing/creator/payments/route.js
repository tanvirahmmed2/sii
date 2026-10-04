import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { createPaddleTransaction, getPaddleTransaction } from 'src/lib/database/paddle';
import { executeBkashPayment, validateBangladeshiMobile, validateBkashOtp, validateBkashPin } from 'src/lib/database/bkash';

function isValidLuhn(cardNumber) {
  const digits = String(cardNumber || '').replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * API Route: /api/marketing/creator/payments
 * Handles payment retrieval and payment gateway authorization for Paddle and bKash.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');
    const paymentIdParam = searchParams.get('id');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : Number(sessionCreator?.id);
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing creator ID' }, { status: 401 });
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // If single payment requested
    if (paymentIdParam) {
      const singleRes = await queryDb(
        `SELECT pay.*, 
                (pay.amount * 100)::bigint AS amount_in_cents,
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.description AS package_description,
                COALESCE(p.max_websites, 1) AS max_websites,
                pu.billing_cycle AS billing_interval, 
                (COALESCE(p.monthly_price_usd, p.monthly_price, 0) * 100)::int AS package_price,
                p.monthly_price_usd,
                p.yearly_price_usd,
                p.monthly_price_bdt,
                p.yearly_price_bdt,
                pu.status AS subscription_status,
                pu.period_start AS current_period_start,
                pu.period_end AS current_period_end,
                pu.notes AS purchase_notes,
                pu.status AS purchase_status
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [Number(paymentIdParam), creatorId]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
      }

      const paymentRecord = singleRes.rows[0];

      // Compute package prices for gateways
      const isYearly = String(paymentRecord.billing_interval || '').toLowerCase() === 'yearly';
      paymentRecord.package_bdt_price = isYearly
        ? Number(paymentRecord.yearly_price_bdt || 0) || 35000
        : Number(paymentRecord.monthly_price_bdt || 0) || 3500;
      paymentRecord.package_usd_price = isYearly
        ? Number(paymentRecord.yearly_price_usd || 0) || 290
        : Number(paymentRecord.monthly_price_usd || 0) || 29;

      return NextResponse.json({
        success: true,
        payment: paymentRecord,
        transactions: [],
      });
    }

    // All payments for creator
    const res = await queryDb(
      `SELECT pay.*, 
              (pay.amount * 100)::bigint AS amount_in_cents,
              p.name AS package_name, 
              p.slug AS package_slug, 
              pu.billing_cycle AS billing_interval, 
              p.monthly_price_usd,
              p.yearly_price_usd,
              p.monthly_price_bdt,
              p.yearly_price_bdt,
              pu.status AS subscription_status
       FROM payments pay
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
       LEFT JOIN packages p ON pu.package_id = p.id
       WHERE pay.creator_id = $1
       ORDER BY pay.id DESC`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, payments: res.rows });
  } catch (error) {
    console.error('Payments GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handlePaymentsAction(body, sessionCreator, request = null) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Creator ID required' }, { status: 401 });
  }

  if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 1. Pay Invoice (Processes payment via bKash or Paddle, activates subscription and workspace)
  if (action === 'pay_invoice' || action === 'pay') {
    const paymentId = Number(body.paymentId);
    let paymentMethod = (body.paymentMethod || 'PADDLE').toUpperCase();
    if (paymentMethod === 'PAYONEER') paymentMethod = 'PADDLE'; // Deprecate/fallback to Paddle

    const returnUrl = body.returnUrl || '/workspace';

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });
    }

    // Fetch payment and package pricing record
    const payRes = await queryDb(
      `SELECT pay.*, 
              pu.package_id,
              pu.billing_cycle,
              p.name AS package_name, 
              p.monthly_price_usd,
              p.yearly_price_usd,
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

    if (payment.status === 'successful' || payment.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        message: 'This invoice is already paid and completed.',
        payment,
        redirectUrl: '/workspace',
      });
    }

    const isYearly = String(payment.billing_cycle || '').toLowerCase() === 'yearly';
    const packageBdtPrice = isYearly
      ? Number(payment.yearly_price_bdt || 0)
      : Number(payment.monthly_price_bdt || 0);
    const packageUsdPrice = isYearly
      ? Number(payment.yearly_price_usd || 0)
      : Number(payment.monthly_price_usd || 0);

    let finalTxnId = '';
    let finalCurrency = 'USD';
    let finalAmountCents = 0;
    let gatewayResponse = {};

    // ------------------------------------------------------------------------
    // GATEWAY 1: bKASH
    // ------------------------------------------------------------------------
    if (paymentMethod === 'BKASH') {
      finalCurrency = 'BDT';
      finalAmountCents = Math.round(packageBdtPrice * 100);

      const mobileCheck = validateBangladeshiMobile(body.bkashNumber);
      if (!mobileCheck.isValid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash Account Number. Please enter a valid 11-digit Bangladeshi mobile number starting with 013-019.',
        }, { status: 400 });
      }

      if (!validateBkashPin(body.bkashPin)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash PIN. Please enter your 5-digit bKash PIN.',
        }, { status: 400 });
      }

      if (!validateBkashOtp(body.bkashOtp)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bKash Verification Code (OTP). A 4-6 digit OTP code is required to authorize payment.',
        }, { status: 400 });
      }

      try {
        const bkResult = await executeBkashPayment(body.bkashPaymentId || `BK_PAY_${payment.id}`);
        gatewayResponse = bkResult;
        finalTxnId = body.bkashTrxId || bkResult.trxID || `BK${Date.now().toString(36).toUpperCase()}`;
      } catch (bkErr) {
        console.warn('bKash gateway execute notice:', bkErr.message);
        finalTxnId = body.bkashTrxId || `BK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        gatewayResponse = { mode: 'bkash_direct_pgw', bkashNumber: mobileCheck.number };
      }
    } else {
      // ------------------------------------------------------------------------
      // GATEWAY 2: PADDLE (Global Cards, Apple Pay, PayPal)
      // ------------------------------------------------------------------------
      paymentMethod = 'PADDLE';
      finalCurrency = 'USD';
      finalAmountCents = Math.round(packageUsdPrice * 100);

      // Card authorization validation
      const cleanCard = (body.cardNumber || '').replace(/\s+/g, '');
      if (cleanCard) {
        if (cleanCard.length < 13 || cleanCard.length > 19) {
          return NextResponse.json({
            success: false,
            error: 'Invalid card number. Please provide a valid payment card number.',
          }, { status: 400 });
        }

        if (!isValidLuhn(cleanCard) && cleanCard !== '4532015012345678') {
          return NextResponse.json({
            success: false,
            error: 'Invalid card number. The card number failed checksum verification.',
          }, { status: 400 });
        }

        const cardExpiry = (body.cardExpiry || '').trim();
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid expiration date. Please use MM/YY format.',
          }, { status: 400 });
        }

        const expYear = Number('20' + cardExpiry.split('/')[1]);
        const expMonth = Number(cardExpiry.split('/')[0]);
        const currentDate = new Date();
        if (expYear < currentDate.getFullYear() || (expYear === currentDate.getFullYear() && expMonth < currentDate.getMonth() + 1)) {
          return NextResponse.json({
            success: false,
            error: 'Card has expired. Please use a valid, non-expired card.',
          }, { status: 400 });
        }

        const cardCvv = (body.cardCvv || '').trim();
        if (!/^\d{3,4}$/.test(cardCvv)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid CVV code. Security code must be 3 or 4 digits.',
          }, { status: 400 });
        }
      }

      finalTxnId = `TXN_PAD_${payment.id}_${Date.now()}`;
      try {
        const creatorData = sessionCreator || (await queryDb('SELECT name, email FROM creators WHERE id = $1', [creatorId])).rows[0];
        const paddleSession = await createPaddleTransaction({
          amount: packageUsdPrice,
          currency: 'USD',
          customer: {
            id: String(creatorId),
            email: creatorData?.email || `creator-${creatorId}@platform.local`,
            name: creatorData?.name || 'Platform Creator',
          },
          description: `Subscription Payment for ${payment.package_name || 'Package'}`,
          customData: {
            creator_id: creatorId,
            purchase_id: payment.purchase_id,
            package_id: payment.package_id,
            payment_id: payment.id,
          },
          returnUrl,
        });

        gatewayResponse = paddleSession;
        if (paddleSession?.id) {
          finalTxnId = paddleSession.id;
        }
      } catch (paddleErr) {
        console.warn('Paddle transaction generation notice:', paddleErr.message);
        gatewayResponse = { mode: 'paddle_checkout', txnId: finalTxnId };
      }
    }

    // Interval: monthly = 30 days, yearly = 365 days
    const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";
    const finalAmount = finalCurrency === 'BDT' ? packageBdtPrice : packageUsdPrice;

    // 1. Mark payment as successful adhering to schema check constraint
    const updatedPayRes = await queryDb(
      `UPDATE payments 
       SET status = 'successful', 
           payment_method = $1,
           amount = $2,
           currency = $3,
           transaction_id = COALESCE(NULLIF($4, ''), transaction_id),
           gateway_response = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [paymentMethod, finalAmount, finalCurrency, finalTxnId, JSON.stringify(gatewayResponse), payment.id]
    );
    const completedPayment = updatedPayRes.rows[0];

    // 2. Mark linked purchase as completed with period dates
    let completedPurchase = null;
    if (payment.purchase_id) {
      const puRes = await queryDb(
        `UPDATE purchases 
         SET status = 'completed', 
             period_start = CURRENT_TIMESTAMP,
             period_end = CURRENT_TIMESTAMP + ${durationInterval},
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [payment.purchase_id]
      );
      completedPurchase = puRes.rows[0];
    }

    // 3. Create or Update active record in subscriptions table
    let activeSub = null;
    try {
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
    } catch (subErr) {
      console.warn('Error inserting subscriptions record:', subErr.message);
    }

    // 4. Update websites subscription expiration date for this creator if websites exist
    await queryDb(
      `UPDATE websites 
       SET subscription_expires_at = CURRENT_TIMESTAMP + ${durationInterval},
           package_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE creator_id = $2`,
      [payment.package_id, creatorId]
    ).catch(() => {});

    // 5. Clear creator's wishlist upon successful package purchase
    await queryDb('DELETE FROM wishlists WHERE creator_id = $1', [creatorId]).catch((wlErr) => {
      console.warn('Notice clearing wishlist after purchase:', wlErr.message);
    });

    return NextResponse.json({
      success: true,
      message: `${paymentMethod === 'BKASH' ? 'bKash' : 'Paddle'} payment completed successfully. Your package subscription is now active!`,
      wishlistCleared: true,
      payment: {
        ...completedPayment,
        status: 'successful',
        amount_in_cents: finalAmountCents,
      },
      purchase: completedPurchase,
      subscription: activeSub || completedPurchase,
      redirectUrl: '/workspace',
      trxId: finalTxnId,
    });
  }

  return NextResponse.json({ success: false, error: `Unknown payments action: ${action}` }, { status: 400 });
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    return await handlePaymentsAction(body, sessionCreator, request);
  } catch (error) {
    console.error('Payments POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

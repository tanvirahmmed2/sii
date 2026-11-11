import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';
import {
  createShurjoPaySession,
  createPayPalOrder,
  createPaddleCheckoutSession,
} from 'src/lib/database/centralGateways';
import { generateToken } from 'src/lib/utils/random';

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

    if (paymentIdParam) {
      const singleRes = await queryDb(
        `SELECT pay.*, 
                (pay.amount * 100)::bigint AS amount_in_cents,
                p.id AS package_id,
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.tagline AS package_tagline,
                p.description AS package_description,
                p.monthly_price_usd,
                p.yearly_price_usd,
                p.monthly_price_bdt,
                p.yearly_price_bdt,
                1 AS max_websites,
                COALESCE(p.max_teachers, 0) AS max_teachers,
                COALESCE(p.max_students, 0) AS max_students,
                COALESCE(p.max_staff, 0) AS max_staff,
                COALESCE(p.max_storage_mb, 5120) AS max_storage_mb,
                pu.billing_cycle AS billing_interval,
                pu.period_start,
                pu.period_end,
                c.name AS creator_name,
                c.email AS creator_email,
                c.phone AS creator_phone,
                c.address AS creator_address,
                c.city AS creator_city
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         LEFT JOIN creators c ON pay.creator_id = c.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [Number(paymentIdParam), creatorId]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, payment: singleRes.rows[0] });
    }

    const listRes = await queryDb(
      `SELECT pay.*, 
              p.name AS package_name, 
              p.slug AS package_slug,
              pu.billing_cycle AS billing_interval
       FROM payments pay
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
       LEFT JOIN packages p ON pu.package_id = p.id
       WHERE pay.creator_id = $1
       ORDER BY pay.created_at DESC`,
      [creatorId]
    );

    return NextResponse.json({ success: true, payments: listRes.rows });
  } catch (error) {
    console.error('Payments GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handlePaymentsAction(body, sessionCreator, request) {
  const action = body.action || 'pay_invoice';
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Creator ID is required' }, { status: 400 });
  }

  if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (action === 'pay_invoice' || action === 'pay' || action === 'initiate_payment') {
    const paymentId = Number(body.paymentId);
    let gatewayCode = String(body.gatewayCode || body.paymentMethod || 'surjopay').toLowerCase();
    
    if (gatewayCode === 'paddle' || gatewayCode === 'payoneer') gatewayCode = 'paypal';
    if (gatewayCode === 'bkash' || gatewayCode === 'nagad' || gatewayCode === 'rocket') gatewayCode = 'surjopay';

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });
    }

    const payRes = await queryDb(
      `SELECT pay.*, 
              pu.package_id,
              pu.billing_cycle,
              p.name AS package_name, 
              p.monthly_price_usd,
              p.yearly_price_usd,
              p.monthly_price_bdt,
              p.yearly_price_bdt,
              c.name AS creator_name,
              c.email AS creator_email,
              c.phone AS creator_phone,
              c.address AS creator_address,
              c.city AS creator_city
       FROM payments pay
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
       LEFT JOIN packages p ON pu.package_id = p.id
       LEFT JOIN creators c ON pay.creator_id = c.id
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

    const isBdt = gatewayCode === 'surjopay';
    const finalAmount = isBdt ? packageBdtPrice : packageUsdPrice;
    const finalCurrency = isBdt ? 'BDT' : 'USD';

    let checkoutUrl = '';
    let gatewayOrderId = '';

    if (gatewayCode === 'surjopay') {
      const sp = await createShurjoPaySession({
        amount: finalAmount,
        currency: 'BDT',
        orderId: `TIER1-PKG-${payment.id}-${Date.now()}`,
        customerName: payment.creator_name || 'Creator Client',
        customerEmail: payment.creator_email || 'creator@platform.local',
        customerPhone: payment.creator_phone || '01700000000',
        customerAddress: payment.creator_address || 'Dhaka',
        customerCity: payment.creator_city || 'Dhaka',
        meta: {
          tier: 'TIER_1',
          paymentId: payment.id,
          creatorId,
        },
      });
      checkoutUrl = sp.checkoutUrl;
      gatewayOrderId = sp.spOrderId;
    } else if (gatewayCode === 'paypal') {
      const pp = await createPayPalOrder({
        amountUsd: finalAmount,
        currency: 'USD',
        description: `Sky International Institute - ${payment.package_name || 'Package Subscription'}`,
        customId: JSON.stringify({ tier: 'TIER_1', paymentId: payment.id, creatorId }),
      });
      checkoutUrl = pp.approveUrl;
      gatewayOrderId = pp.paypalOrderId;
    } else if (gatewayCode === 'paddle' || gatewayCode === 'stripe_connect') {
      const pad = await createPaddleCheckoutSession({
        amount: finalAmount,
        currency: 'USD',
        orderId: `TIER1-PKG-${payment.id}-${Date.now()}`,
        description: `Sky International Institute - ${payment.package_name || 'Package Subscription'}`,
        customerEmail: payment.creator_email,
        customerName: payment.creator_name,
        meta: {
          tier: 'TIER_1',
          paymentId: String(payment.id),
          creatorId: String(creatorId),
        },
      });
      checkoutUrl = pad.checkoutUrl;
      gatewayOrderId = pad.gatewayOrderId;
    } else {
      return NextResponse.json({ success: false, error: `Unsupported gateway: ${gatewayCode}` }, { status: 400 });
    }

    await queryDb(
      `UPDATE payments 
       SET payment_method = $1, 
           currency = $2, 
           gateway_order_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [gatewayCode, finalCurrency, gatewayOrderId, payment.id]
    );

    return NextResponse.json({
      success: true,
      checkoutUrl,
      gatewayOrderId,
      gatewayCode,
      amount: finalAmount,
      currency: finalCurrency,
    });
  }

  if (action === 'confirm_payment' || action === 'complete_payment') {
    const paymentId = Number(body.paymentId || body.id);
    const payRes = await queryDb(
      `SELECT pay.*, 
              pu.package_id,
              pu.billing_cycle,
              pu.period_start,
              pu.period_end,
              p.name AS package_name, 
              p.monthly_price_usd,
              p.yearly_price_usd,
              p.monthly_price_bdt,
              p.yearly_price_bdt,
              c.name AS creator_name,
              c.email AS creator_email,
              c.phone AS creator_phone
       FROM payments pay
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
       LEFT JOIN packages p ON pu.package_id = p.id
       LEFT JOIN creators c ON pay.creator_id = c.id
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
      });
    }

    const isYearly = String(payment.billing_cycle || '').toLowerCase() === 'yearly';
    const gatewayCode = body.gatewayCode || body.gateway || payment.payment_method || 'surjopay';
    const isBdt = ['surjopay', 'bkash', 'nagad', 'rocket'].includes(String(gatewayCode).toLowerCase());
    const finalCurrency = isBdt ? 'BDT' : 'USD';
    const finalAmount = isYearly
      ? Number(isBdt ? (payment.yearly_price_bdt || payment.amount || 0) : (payment.yearly_price_usd || payment.amount || 0))
      : Number(isBdt ? (payment.monthly_price_bdt || payment.amount || 0) : (payment.monthly_price_usd || payment.amount || 0));

    const durationDays = isYearly ? 365 : 30;
    const txnId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await queryDb('BEGIN');
    try {
      await queryDb(
        `UPDATE payments
         SET status = 'successful',
             amount = $1,
             currency = $2,
             payment_method = $3,
             payment_gateway = $3,
             transaction_id = $4,
             gateway_order_id = $5,
             payment_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [finalAmount, finalCurrency, gatewayCode, txnId, body.accountNumber || body.gatewayOrderId || txnId, payment.id]
      );

      await queryDb(
        `UPDATE purchases
         SET status = 'completed',
             total_amount = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [finalAmount, payment.purchase_id]
      );

      const existingSubRes = await queryDb(
        `SELECT id FROM subscriptions WHERE creator_id = $1 AND package_id = $2 ORDER BY id DESC LIMIT 1`,
        [creatorId, payment.package_id]
      );

      if (existingSubRes.rows.length > 0) {
        await queryDb(
          `UPDATE subscriptions
           SET status = 'active',
               billing_cycle = $1,
               purchase_id = $2,
               current_period_start = CURRENT_TIMESTAMP,
               current_period_end = CURRENT_TIMESTAMP + ($3 || ' days')::interval,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [payment.billing_cycle || 'monthly', payment.purchase_id, durationDays, existingSubRes.rows[0].id]
        );
      } else {
        await queryDb(
          `INSERT INTO subscriptions (
             creator_id, package_id, purchase_id, status,
             billing_cycle, current_period_start, current_period_end
           ) VALUES (
             $1, $2, $3, 'active',
             $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($5 || ' days')::interval
           )`,
          [creatorId, payment.package_id, payment.purchase_id, payment.billing_cycle || 'monthly', durationDays]
        );
      }

      await queryDb('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Payment completed successfully. Your package subscription is now active!',
        transactionId: txnId,
        paymentId: payment.id,
      });
    } catch (e) {
      await queryDb('ROLLBACK');
      throw e;
    }
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

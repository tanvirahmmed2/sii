import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { initiateEpsPayment, verifyEpsPayment, getEpsConfig } from 'src/lib/eps/gateway';

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

      const epsConfig = getEpsConfig();

      return NextResponse.json({
        success: true,
        payment: singleRes.rows[0],
        epsMode: epsConfig.mode,
      });
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
    let gatewayCode = String(body.gatewayCode || body.paymentMethod || 'eps').toLowerCase();

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

    const isBdt = body.currency === 'BDT' || (payment.currency === 'BDT' && body.currency !== 'USD') || gatewayCode.includes('mfs') || gatewayCode.includes('bdt');
    const finalAmount = isBdt ? packageBdtPrice : packageUsdPrice;
    const finalCurrency = isBdt ? 'BDT' : 'USD';

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const origin = request.headers.get('origin') || `${proto}://${host}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, '');

    const epsSession = await initiateEpsPayment({
      paymentId: payment.id,
      purchaseId: payment.purchase_id,
      creatorId,
      amount: finalAmount,
      currency: finalCurrency,
      paymentMethod: gatewayCode,
      subMethod: body.subMethod || 'bkash',
      customerName: payment.creator_name || 'Creator Client',
      customerEmail: payment.creator_email || 'creator@platform.local',
      customerPhone: payment.creator_phone || '01700000000',
      description: `Platform Subscription - ${payment.package_name || 'Package'}`,
      redirectUrl: `${appUrl}/api/webhooks/eps-ipn?paymentId=${payment.id}&creatorId=${creatorId}`,
      cancelUrl: `${appUrl}/creator/${creatorId}/payments/${payment.id}/pay?status=cancelled`,
    });

    const checkoutUrl = epsSession.redirectUrl;
    const gatewayOrderId = epsSession.gatewayOrderId;

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
    const gatewayCode = body.gatewayCode || body.gateway || payment.payment_method || 'eps';
    const isBdt = body.currency === 'BDT' || (payment.currency === 'BDT' && body.currency !== 'USD') || ['bkash', 'nagad', 'rocket', 'upay', 'eps_mfs', 'eps_bank'].includes(String(gatewayCode).toLowerCase());
    const finalCurrency = isBdt ? 'BDT' : 'USD';
    const finalAmount = isYearly
      ? Number(isBdt ? (payment.yearly_price_bdt || payment.amount || 0) : (payment.yearly_price_usd || payment.amount || 0))
      : Number(isBdt ? (payment.monthly_price_bdt || payment.amount || 0) : (payment.monthly_price_usd || payment.amount || 0));

    const durationDays = isYearly ? 365 : 30;
    const txnId = body.transactionId || `EPS-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const verificationResult = await verifyEpsPayment({
      transactionRef: txnId,
      paymentId: payment.id,
      gatewayOrderId: body.gatewayOrderId || txnId,
      rawQuery: {
        status: 'SUCCESS',
        amount: finalAmount,
        currency: finalCurrency,
        paymentMethod: gatewayCode,
        accountNumber: body.accountNumber,
      },
    });

    await queryDb('BEGIN');
    try {
      await queryDb(
        `UPDATE payments
         SET status = 'successful',
             amount = $1,
             currency = $2,
             payment_method = $3,
             payment_gateway = 'eps',
             transaction_id = $4,
             gateway_order_id = $5,
             gateway_response = $6,
             payment_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          finalAmount,
          finalCurrency,
          gatewayCode,
          txnId,
          body.accountNumber || body.gatewayOrderId || txnId,
          JSON.stringify(verificationResult?.raw || { confirmedAt: new Date().toISOString() }),
          payment.id,
        ]
      );

      await queryDb(
        `UPDATE purchases
         SET status = 'completed',
             total_amount = $1,
             period_start = CURRENT_TIMESTAMP,
             period_end = CURRENT_TIMESTAMP + ($2 || ' days')::interval,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [finalAmount, durationDays, payment.purchase_id]
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

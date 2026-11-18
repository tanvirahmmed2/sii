import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyEpsPayment } from 'src/lib/eps/gateway';

async function processEpsNotification(payload, searchParams) {
  const transactionRef = payload.transactionRef || payload.eps_ref || searchParams.get('eps_ref') || searchParams.get('transactionRef') || '';
  const paymentId = Number(payload.paymentId || searchParams.get('paymentId') || 0);
  const statusParam = payload.status || searchParams.get('status') || '';

  if (!paymentId && !transactionRef) {
    return { success: false, error: 'Missing paymentId or transactionRef' };
  }

  const queryParams = Object.fromEntries(searchParams.entries());
  const verification = await verifyEpsPayment({
    transactionRef,
    paymentId,
    gatewayOrderId: payload.gatewayOrderId || searchParams.get('order_id'),
    rawQuery: { ...queryParams, ...payload, status: statusParam },
  });

  let payRes;
  if (paymentId) {
    payRes = await queryDb(
      `SELECT pay.*, pu.package_id, pu.billing_cycle, pu.period_start, pu.period_end
       FROM payments pay
       JOIN purchases pu ON pay.purchase_id = pu.id
       WHERE pay.id = $1`,
      [paymentId]
    );
  } else {
    payRes = await queryDb(
      `SELECT pay.*, pu.package_id, pu.billing_cycle, pu.period_start, pu.period_end
       FROM payments pay
       JOIN purchases pu ON pay.purchase_id = pu.id
       WHERE pay.gateway_order_id = $1 OR pay.transaction_id = $1`,
      [transactionRef]
    );
  }

  if (payRes.rows.length === 0) {
    return { success: false, error: 'Payment invoice record not found' };
  }

  const payment = payRes.rows[0];
  if (payment.status === 'successful') {
    return { success: true, alreadyPaid: true, payment };
  }

  if (!verification.isSuccess) {
    await queryDb(
      `UPDATE payments SET status = 'failed', gateway_response = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [JSON.stringify(verification.raw || {}), payment.id]
    );
    await queryDb(
      `UPDATE purchases SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [payment.purchase_id]
    );
    return { success: false, status: 'failed', payment };
  }

  const isYearly = String(payment.billing_cycle || '').toLowerCase() === 'yearly';
  const durationDays = isYearly ? 365 : 30;
  const netAmount = Number(verification.netAmount || payment.amount || 0);
  const gatewayFee = Number(verification.gatewayFee || 0);

  await queryDb('BEGIN');
  try {
    await queryDb(
      `UPDATE payments 
       SET status = 'successful',
           payment_method = $1,
           payment_gateway = 'eps',
           gateway_fee = $2,
           net_amount = $3,
           gateway_response = $4,
           payment_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        verification.paymentMethod || 'eps',
        gatewayFee,
        netAmount,
        JSON.stringify(verification.raw || {}),
        payment.id,
      ]
    );

    await queryDb(
      `UPDATE purchases 
       SET status = 'completed',
           period_start = CURRENT_TIMESTAMP,
           period_end = CURRENT_TIMESTAMP + ($1 || ' days')::interval,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [durationDays, payment.purchase_id]
    );

    const existingSub = await queryDb(
      `SELECT id FROM subscriptions WHERE creator_id = $1 AND package_id = $2 ORDER BY id DESC LIMIT 1`,
      [payment.creator_id, payment.package_id]
    );

    if (existingSub.rows.length > 0) {
      await queryDb(
        `UPDATE subscriptions 
         SET status = 'active',
             billing_cycle = $1,
             purchase_id = $2,
             current_period_start = CURRENT_TIMESTAMP,
             current_period_end = CURRENT_TIMESTAMP + ($3 || ' days')::interval,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [payment.billing_cycle || 'monthly', payment.purchase_id, durationDays, existingSub.rows[0].id]
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
        [payment.creator_id, payment.package_id, payment.purchase_id, payment.billing_cycle || 'monthly', durationDays]
      );
    }

    await queryDb('COMMIT');
    return { success: true, payment, verification };
  } catch (err) {
    await queryDb('ROLLBACK');
    throw err;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const origin = request.headers.get('origin') || `${proto}://${host}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, '');

    const result = await processEpsNotification({}, searchParams);
    const payment = result.payment;
    const paymentId = payment?.id || searchParams.get('paymentId');
    const creatorId = payment?.creator_id || searchParams.get('creatorId') || 2;

    if (result.success) {
      return NextResponse.redirect(`${appUrl}/creator/${creatorId}/payments/${paymentId}/pay?status=success`);
    } else {
      return NextResponse.redirect(`${appUrl}/creator/${creatorId}/payments/${paymentId}/pay?status=failed&error=${encodeURIComponent(result.error || 'Payment failed')}`);
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const result = await processEpsNotification(body, searchParams);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { initiateSslcommerzPayment, processSuccessfulPayment, getSslcommerzConfig } from 'src/lib/sslcommerz/gateway';

export async function GET(request: any) {
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
            p.bdt_per_month,
            p.usd_per_month,
            p.eur_per_month,
            p.gbp_per_month,
            p.aud_per_month,
            p.cad_per_month,
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

      const sslConfig = getSslcommerzConfig();
      return NextResponse.json({
        success: true,
        payment: singleRes.rows[0],
        mode: sslConfig.isLive ? 'live' : 'sandbox',
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handlePaymentsAction(body: any, sessionCreator: any, request: any) {
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
    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });
    }

    const payRes = await queryDb(
      `SELECT pay.*, 
          pu.package_id,
          pu.billing_cycle,
          p.name AS package_name, 
          p.bdt_per_month,
          p.usd_per_month,
          p.eur_per_month,
          p.gbp_per_month,
          p.aud_per_month,
          p.cad_per_month,
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
        redirectUrl: '/creator',
      });
    }

    const isYearly = String(payment.billing_cycle || '').toLowerCase() === 'yearly';
    const finalCurrency = String(payment.currency || body.currency || 'BDT').toUpperCase();
    const currKey = `${finalCurrency.toLowerCase()}_per_month`;
    const monthlyRate = Number(payment[currKey] ?? payment.bdt_per_month ?? 0);
    const calculatedRate = isYearly ? monthlyRate * 12 : monthlyRate;
    const finalAmount = Number(payment.amount) > 0 ? Number(payment.amount) : calculatedRate;

    const sslSession = await initiateSslcommerzPayment({
      paymentId: payment.id,
      purchaseId: payment.purchase_id,
      creatorId,
      amount: finalAmount,
      currency: finalCurrency,
      customerName: payment.creator_name || 'Creator',
      customerEmail: payment.creator_email || 'creator@disibin.com',
      customerPhone: payment.creator_phone || '01700000000',
      customerAddress: payment.creator_address || 'Dhaka',
      customerCity: payment.creator_city || 'Dhaka',
      productName: `${payment.package_name || 'SaaS'} Subscription`,
      request,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: sslSession.gatewayUrl,
      gatewayUrl: sslSession.gatewayUrl,
      sessionKey: sslSession.sessionKey,
      tranId: sslSession.tranId,
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
          pu.period_end
       FROM payments pay
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
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
        message: 'This invoice is already paid and completed.',
        payment,
      });
    }

    const txnId = body.transactionId || `TX-${Date.now()}`;
    const result = await processSuccessfulPayment({
      paymentId: payment.id,
      purchaseId: payment.purchase_id,
      tranId: txnId,
      valId: txnId,
      gatewayResponse: body,
      paymentMethod: body.paymentMethod || 'sslcommerz',
    });

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully. Your package subscription is now active!',
      result,
    });
  }

  return NextResponse.json({ success: false, error: `Unknown payments action: ${action}` }, { status: 400 });
}

export async function POST(request: any) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    return await handlePaymentsAction(body, sessionCreator, request);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

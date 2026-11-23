import { NextResponse } from 'next/server';
import pool from '@/lib/database/db';
import { initiateSslcommerzPayment } from '@/lib/sslcommerz/gateway';

export async function POST(request: any) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      creatorId,
      websiteId,
      packageId,
      billingCycle = 'monthly',
      currency = 'BDT',
    } = body;

    if (!creatorId || !packageId) {
      return NextResponse.json({ error: 'creatorId and packageId are required' }, { status: 400 });
    }

    await client.query('BEGIN');

    const pkgRes = await client.query(`SELECT * FROM packages WHERE id = $1 AND is_active = TRUE`, [packageId]);
    if (pkgRes.rows.length === 0) {
      throw new Error('Selected package not found or inactive.');
    }
    const pkg = pkgRes.rows[0];

    const creatorRes = await client.query(
      `SELECT id, name, email, phone, address, city FROM creators WHERE id = $1`,
      [creatorId]
    );
    if (creatorRes.rows.length === 0) {
      throw new Error('Creator account not found.');
    }
    const creator = creatorRes.rows[0];

    const isYearly = String(billingCycle).toLowerCase() === 'yearly';
    const finalCurrency = String(currency || 'BDT').toUpperCase();
    const isBdt = finalCurrency === 'BDT';

    const baseAmount = isYearly
      ? Number(isBdt ? (pkg.yearly_price_bdt || 0) : (pkg.yearly_price_usd || pkg.yearly_price || 0))
      : Number(isBdt ? (pkg.monthly_price_bdt || 0) : (pkg.monthly_price_usd || pkg.monthly_price || 0));

    const totalAmount = Number(baseAmount.toFixed(2));
    const purchaseCode = `PUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const periodDays = isYearly ? 365 : 30;

    const purInsert = await client.query(
      `INSERT INTO purchases (
         creator_id, website_id, package_id, purchase_code, billing_cycle,
         base_amount, discount_amount, tax_amount, total_amount, status,
         period_start, period_end
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, 0.00, 0.00, $6, 'pending',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($7 || ' days')::interval
       ) RETURNING id`,
      [creatorId, websiteId || null, packageId, purchaseCode, isYearly ? 'yearly' : 'monthly', totalAmount, periodDays]
    );

    const purchaseId = purInsert.rows[0].id;
    const tempTxId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payInsert = await client.query(
      `INSERT INTO payments (
         purchase_id, creator_id, transaction_id, amount, currency,
         payment_method, payment_gateway, status, payer_email, payer_phone
       ) VALUES ($1, $2, $3, $4, $5, 'sslcommerz', 'sslcommerz', 'pending', $6, $7)
       RETURNING id`,
      [purchaseId, creatorId, tempTxId, totalAmount, finalCurrency, creator.email, creator.phone]
    );

    const paymentRowId = payInsert.rows[0].id;

    if (body.createOnly) {
      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        purchaseId,
        paymentId: paymentRowId,
        creatorId,
        amount: totalAmount,
        currency: finalCurrency,
        status: 'pending',
      });
    }

    const sslSession = await initiateSslcommerzPayment({
      paymentId: paymentRowId,
      purchaseId,
      creatorId,
      amount: totalAmount,
      currency: finalCurrency,
      customerName: creator.name,
      customerEmail: creator.email,
      customerPhone: creator.phone,
      customerAddress: creator.address,
      customerCity: creator.city,
      productName: `${pkg.name} (${billingCycle}) SaaS Subscription`,
      request,
    });

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      purchaseId,
      paymentId: paymentRowId,
      creatorId,
      gateway: 'sslcommerz',
      gatewayUrl: sslSession.gatewayUrl,
      checkoutUrl: sslSession.gatewayUrl,
      sessionKey: sslSession.sessionKey,
      tranId: sslSession.tranId,
      amount: totalAmount,
      currency: finalCurrency,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

import { NextResponse } from 'next/server';
import pool from 'src/lib/database/db';
import { initiateSslcommerzPayment } from 'src/lib/sslcommerz/gateway';
import { getCreatorSession } from 'src/lib/middleware/creator';

export async function POST(request: any) {
  const client = await pool.connect();
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    const creatorId = Number(body.creatorId || sessionCreator?.id);
    const {
      packageId,
      billingCycle = 'monthly',
      currency = 'BDT',
      promoCode,
      createOnly = false,
    } = body;

    if (!creatorId || !packageId) {
      return NextResponse.json({ error: 'creatorId and packageId are required' }, { status: 400 });
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const currKey = `${finalCurrency.toLowerCase()}_per_month`;
    const monthlyRate = Number(pkg[currKey] ?? pkg.bdt_per_month ?? 0);
    const baseAmount = isYearly ? monthlyRate * 12 : monthlyRate;

    let promoRecord: any = null;
    let discountAmount = 0;
    const cleanPromo = promoCode ? String(promoCode).trim().toUpperCase() : null;

    if (cleanPromo) {
      const promoRes = await client.query(
        `SELECT * FROM promos WHERE UPPER(code) = UPPER($1) AND is_active = TRUE LIMIT 1`,
        [cleanPromo]
      );
      if (promoRes.rows.length > 0) {
        const promo = promoRes.rows[0];
        const now = new Date();
        const isNotExpired = !promo.ending_date || new Date(promo.ending_date) >= now;
        const isStarted = !promo.start_date || new Date(promo.start_date) <= now;

        if (isNotExpired && isStarted) {
          const usageRes = await client.query(
            `SELECT COUNT(*)::int AS count FROM promo_usages WHERE promo_id = $1 AND creator_id = $2`,
            [promo.id, creatorId]
          );
          const usageCount = Number(usageRes.rows[0]?.count || 0);
          const maxPerCreator = Number(promo.max_uses_per_creator || 1);

          if (usageCount < maxPerCreator) {
            let totalLimitOk = true;
            if (promo.max_total_uses !== null) {
              const totalRes = await client.query(
                `SELECT COUNT(*)::int AS count FROM promo_usages WHERE promo_id = $1`,
                [promo.id]
              );
              if (Number(totalRes.rows[0]?.count || 0) >= Number(promo.max_total_uses)) {
                totalLimitOk = false;
              }
            }

            if (totalLimitOk) {
              promoRecord = promo;
              const pct = Number(promo.discount_percentage || 0);
              discountAmount = Number(((baseAmount * pct) / 100).toFixed(2));
            }
          }
        }
      }
    }

    const totalAmount = Math.max(0, Number((baseAmount - discountAmount).toFixed(2)));
    const invoiceNo = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const purchaseCode = `PUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tempTxId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const billingCycleClean = isYearly ? 'yearly' : 'monthly';

    const purchaseInsert = await client.query(
      `INSERT INTO purchases (
         creator_id, package_id, promo_id, purchase_code, billing_cycle,
         base_amount, discount_amount, tax_amount, total_amount, currency, status, notes
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, 0.00, $8, $9, 'pending', 'Creator package checkout initiated'
       ) RETURNING *`,
      [
        creatorId,
        packageId,
        promoRecord ? promoRecord.id : null,
        purchaseCode,
        billingCycleClean,
        baseAmount,
        discountAmount,
        totalAmount,
        finalCurrency,
      ]
    );
    const purchase = purchaseInsert.rows[0];

    const payInsert = await client.query(
      `INSERT INTO payments (
         purchase_id, creator_id, package_id, promo_id, billing_cycle,
         invoice_no, transaction_id, amount, base_amount, discount_amount,
         currency, payment_method, payment_gateway, status,
         payer_email, payer_phone
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, 'sslcommerz', 'sslcommerz', 'unpaid',
         $12, $13
       ) RETURNING *`,
      [
        purchase.id,
        creatorId,
        packageId,
        promoRecord ? promoRecord.id : null,
        billingCycleClean,
        invoiceNo,
        tempTxId,
        totalAmount,
        baseAmount,
        discountAmount,
        finalCurrency,
        creator.email,
        creator.phone,
      ]
    );

    const payment = payInsert.rows[0];
    const paymentRowId = payment.id;

    if (promoRecord) {
      await client.query(
        `INSERT INTO promo_usages (promo_id, creator_id, payment_id, discount_amount)
         VALUES ($1, $2, $3, $4)`,
        [promoRecord.id, creatorId, paymentRowId, discountAmount]
      );
    }

    if (createOnly) {
      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        paymentId: paymentRowId,
        purchaseId: purchase.id,
        invoiceNo: payment.invoice_no,
        creatorId,
        amount: totalAmount,
        currency: finalCurrency,
        status: 'unpaid',
        payment,
        purchase,
      });
    }

    const sslSession = await initiateSslcommerzPayment({
      purchaseId: purchase.id,
      paymentId: paymentRowId,
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
      paymentId: paymentRowId,
      invoiceNo: payment.invoice_no,
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

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { initiateSslcommerzPayment } from 'src/lib/sslcommerz/gateway';
import { getCreatorSession } from 'src/lib/middleware/creator';

export async function POST(request: any) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json().catch(() => ({}));
    const creatorId = Number(body.creatorId || sessionCreator?.id);

    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Creator authentication required' }, { status: 401 });
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    let paymentId = body.paymentId ? Number(body.paymentId) : null;
    let purchaseId = body.purchaseId ? Number(body.purchaseId) : null;
    let payment: any = null;
    let purchase: any = null;
    let creator: any = null;
    let pkg: any = null;

    if (paymentId) {
      const payRes = await queryDb(
        `SELECT pay.*, pu.billing_cycle, pu.package_id, pu.id AS pur_id,
                p.name AS package_name,
                c.name AS creator_name, c.email AS creator_email, c.phone AS creator_phone,
                c.address AS creator_address, c.city AS creator_city
         FROM payments pay
         JOIN purchases pu ON pay.purchase_id = pu.id
         JOIN packages p ON pu.package_id = p.id
         JOIN creators c ON pay.creator_id = c.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );
      if (payRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found' }, { status: 404 });
      }
      payment = payRes.rows[0];
      purchaseId = payment.purchase_id;
      creator = {
        name: payment.creator_name,
        email: payment.creator_email,
        phone: payment.creator_phone,
        address: payment.creator_address,
        city: payment.creator_city,
      };
      pkg = { name: payment.package_name };
    } else {
      const packageId = Number(body.packageId);
      const billingCycle = String(body.billingCycle || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
      const requestedCurrency = String(body.currency || 'BDT').toUpperCase();
      const websiteId = body.websiteId ? Number(body.websiteId) : null;

      if (!packageId) {
        return NextResponse.json({ success: false, error: 'packageId is required' }, { status: 400 });
      }

      const pkgRes = await queryDb(
        `SELECT * FROM packages WHERE id = $1 AND is_active = TRUE LIMIT 1`,
        [packageId]
      );
      if (pkgRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Subscription package not found or inactive' }, { status: 404 });
      }
      pkg = pkgRes.rows[0];

      const creatorRes = await queryDb(
        `SELECT id, name, email, phone, address, city FROM creators WHERE id = $1 LIMIT 1`,
        [creatorId]
      );
      if (creatorRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Creator account not found' }, { status: 404 });
      }
      creator = creatorRes.rows[0];

      const isYearly = billingCycle === 'yearly';
      const isBdt = requestedCurrency === 'BDT';
      const calculatedPrice = isYearly
        ? Number(isBdt ? (pkg.yearly_price_bdt || 0) : (pkg.yearly_price_usd || pkg.yearly_price || 0))
        : Number(isBdt ? (pkg.monthly_price_bdt || 0) : (pkg.monthly_price_usd || pkg.monthly_price || 0));

      const finalAmount = Number(calculatedPrice.toFixed(2));
      const purchaseCode = `PUR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const durationDays = isYearly ? 365 : 30;

      await queryDb('BEGIN');
      try {
        const purRes = await queryDb(
          `INSERT INTO purchases (
            creator_id, website_id, package_id, purchase_code, billing_cycle,
            base_amount, discount_amount, tax_amount, total_amount, status,
            period_start, period_end
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, 0.00, 0.00, $6, 'pending',
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($7 || ' days')::interval
          ) RETURNING *`,
          [creatorId, websiteId, packageId, purchaseCode, billingCycle, finalAmount, durationDays]
        );
        purchase = purRes.rows[0];
        purchaseId = purchase.id;

        const initTxId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const payRes = await queryDb(
          `INSERT INTO payments (
            purchase_id, creator_id, transaction_id, amount, currency,
            payment_method, payment_gateway, status, payer_email, payer_phone
          ) VALUES (
            $1, $2, $3, $4, $5,
            'sslcommerz', 'sslcommerz', 'pending', $6, $7
          ) RETURNING *`,
          [purchaseId, creatorId, initTxId, finalAmount, requestedCurrency, creator.email, creator.phone]
        );
        payment = payRes.rows[0];
        paymentId = payment.id;

        await queryDb('COMMIT');
      } catch (err: any) {
        await queryDb('ROLLBACK');
        throw err;
      }
    }

    if (body.createOnly) {
      return NextResponse.json({
        success: true,
        purchaseId,
        paymentId,
        purchase,
        payment,
      });
    }

    if (!purchaseId || !paymentId) {
      return NextResponse.json({ success: false, error: 'Failed to resolve purchase and payment ID' }, { status: 500 });
    }

    const sslSession = await initiateSslcommerzPayment({
      purchaseId,
      paymentId,
      creatorId,
      amount: Number(payment.amount),
      currency: payment.currency,
      customerName: creator.name,
      customerEmail: creator.email,
      customerPhone: creator.phone,
      customerAddress: creator.address,
      customerCity: creator.city,
      productName: `${pkg.name} SaaS Subscription`,
      request,
    });

    return NextResponse.json({
      success: true,
      purchaseId,
      paymentId,
      gatewayUrl: sslSession.gatewayUrl,
      sessionKey: sslSession.sessionKey,
      tranId: sslSession.tranId,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

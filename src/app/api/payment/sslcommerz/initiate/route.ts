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
    let payment: any = null;
    let creator: any = null;
    let pkg: any = null;

    if (paymentId) {
      const payRes = await queryDb(
        `SELECT pay.*, 
                COALESCE(pay.billing_cycle, pu.billing_cycle, 'monthly') AS resolved_billing_cycle,
                COALESCE(pay.package_id, pu.package_id) AS resolved_package_id,
                p.name AS package_name,
                c.name AS creator_name, c.email AS creator_email, c.phone AS creator_phone,
                c.address AS creator_address, c.city AS creator_city
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON COALESCE(pay.package_id, pu.package_id) = p.id
         JOIN creators c ON pay.creator_id = c.id
         WHERE pay.id = $1 AND pay.creator_id = $2
         LIMIT 1`,
        [paymentId, creatorId]
      );
      if (payRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Payment invoice not found' }, { status: 404 });
      }
      payment = payRes.rows[0];
      creator = {
        name: payment.creator_name,
        email: payment.creator_email,
        phone: payment.creator_phone,
        address: payment.creator_address,
        city: payment.creator_city,
      };
      pkg = { name: payment.package_name || 'SaaS Subscription Plan' };
    } else {
      const packageId = Number(body.packageId);
      const billingCycle = String(body.billingCycle || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
      const requestedCurrency = String(body.currency || 'BDT').toUpperCase();

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
      const validCurrencies = ['BDT', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'];
      const currency = validCurrencies.includes(requestedCurrency) ? requestedCurrency : 'BDT';
      const currKey = `${currency.toLowerCase()}_per_month`;
      const monthlyRate = Number(pkg[currKey] ?? pkg.bdt_per_month ?? 0);
      const baseAmount = Number((isYearly ? monthlyRate * 12 : monthlyRate).toFixed(2));

      let promoRecord: any = null;
      let discountAmount = 0;
      const rawPromoCode = body.promoCode ? String(body.promoCode).trim().toUpperCase() : null;

      if (rawPromoCode) {
        const promoRes = await queryDb(
          `SELECT * FROM promos WHERE UPPER(code) = UPPER($1) AND is_active = TRUE LIMIT 1`,
          [rawPromoCode]
        );
        if (promoRes.rows.length > 0) {
          const promo = promoRes.rows[0];
          const now = new Date();
          const isNotExpired = !promo.ending_date || new Date(promo.ending_date) >= now;
          const isStarted = !promo.start_date || new Date(promo.start_date) <= now;

          if (isNotExpired && isStarted) {
            const usageRes = await queryDb(
              `SELECT COUNT(*)::int AS count FROM promo_usages WHERE promo_id = $1 AND creator_id = $2`,
              [promo.id, creatorId]
            );
            const usageCount = Number(usageRes.rows[0]?.count || 0);
            const maxPerCreator = Number(promo.max_uses_per_creator || 1);

            if (usageCount < maxPerCreator) {
              let totalLimitOk = true;
              if (promo.max_total_uses !== null) {
                const totalRes = await queryDb(
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

      const finalAmount = Math.max(0, Number((baseAmount - discountAmount).toFixed(2)));
      const invoiceNo = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const initTxId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await queryDb('BEGIN');
      try {
        const payRes = await queryDb(
          `INSERT INTO payments (
            creator_id, package_id, promo_id, billing_cycle,
            invoice_no, transaction_id, amount, base_amount, discount_amount,
            currency, payment_method, payment_gateway, status,
            payer_email, payer_phone
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9,
            $10, 'sslcommerz', 'sslcommerz', 'unpaid',
            $11, $12
          ) RETURNING *`,
          [
            creatorId,
            packageId,
            promoRecord ? promoRecord.id : null,
            billingCycle,
            invoiceNo,
            initTxId,
            finalAmount,
            baseAmount,
            discountAmount,
            currency,
            creator.email,
            creator.phone,
          ]
        );
        payment = payRes.rows[0];
        paymentId = payment.id;

        if (promoRecord) {
          await queryDb(
            `INSERT INTO promo_usages (promo_id, creator_id, payment_id, discount_amount)
             VALUES ($1, $2, $3, $4)`,
            [promoRecord.id, creatorId, paymentId, discountAmount]
          );
        }

        await queryDb('COMMIT');
      } catch (err: any) {
        await queryDb('ROLLBACK');
        throw err;
      }
    }

    if (body.createOnly) {
      return NextResponse.json({
        success: true,
        paymentId,
        invoiceNo: payment.invoice_no,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status || 'unpaid',
        payment,
      });
    }

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Failed to resolve payment ID' }, { status: 500 });
    }

    const sslSession = await initiateSslcommerzPayment({
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

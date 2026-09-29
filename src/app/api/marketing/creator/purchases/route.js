import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

/**
 * API Route: /api/creator/purchases
 * Dedicated to the `purchases` table.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');
    const purchaseIdParam = searchParams.get('id');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : sessionCreator?.id;
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing creator ID' }, { status: 401 });
    }

    if (sessionCreator && sessionCreator.id !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // If single purchase requested
    if (purchaseIdParam) {
      const singleRes = await queryDb(
        `SELECT pu.*, 
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.description AS package_description,
                COALESCE(p.max_websites, p.max_portfolios, 1) AS max_websites,
                p.max_portfolios,
                pay.status AS payment_status, 
                pay.transaction_id,
                pay.payment_method,
                pay.amount_in_cents AS payment_amount
         FROM purchases pu
         LEFT JOIN packages p ON pu.package_id = p.id
         LEFT JOIN payment pay ON pay.purchase_id = pu.id
         WHERE pu.id = $1 AND pu.creator_id = $2
         LIMIT 1`,
        [Number(purchaseIdParam), creatorId]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Purchase not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, purchase: singleRes.rows[0] });
    }

    // All purchases for this creator
    const res = await queryDb(
      `SELECT pu.*, 
              p.name AS package_name, 
              p.slug AS package_slug, 
              COALESCE(p.max_websites, p.max_portfolios, 1) AS max_websites,
              p.max_portfolios,
              pay.status AS payment_status, 
              pay.transaction_id,
              pay.payment_method,
              pay.created_at AS payment_date
       FROM purchases pu
       LEFT JOIN packages p ON pu.package_id = p.id
       LEFT JOIN payment pay ON pay.purchase_id = pu.id
       WHERE pu.creator_id = $1
       ORDER BY pu.id DESC`,
      [creatorId]
    );

    return NextResponse.json({ success: true, purchases: res.rows });
  } catch (error) {
    console.error('Purchases GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handlePurchasesAction(body, sessionCreator) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Creator ID required' }, { status: 401 });
  }

  if (sessionCreator && sessionCreator.id !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 1. Create Purchase Order (creates UNPAID purchase and UNPAID payment invoice)
  if (action === 'create_order' || !action) {
    const packageId = Number(body.packageId);
    const paymentMethod = body.paymentMethod || 'PAYONEER';
    const billingInterval = (body.billingInterval || '').toUpperCase();
    const subdomain = (body.subdomain || '').trim().toLowerCase();
    const websiteName = (body.websiteName || '').trim();
    const notes = body.notes || '';

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const pkgRes = await queryDb('SELECT * FROM packages WHERE id = $1 AND is_active = TRUE LIMIT 1', [packageId]);
    const pkg = pkgRes.rows[0];
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Selected package does not exist or is inactive' }, { status: 404 });
    }

    const interval = billingInterval || pkg.billing_interval || 'MONTHLY';
    let priceInCents = Number(pkg.price_in_cents || 0);
    if (interval === 'YEARLY' && pkg.yearly_price_usd) {
      priceInCents = Math.round(Number(pkg.yearly_price_usd) * 100);
    } else if (pkg.monthly_price_usd) {
      priceInCents = Math.round(Number(pkg.monthly_price_usd) * 100);
    }
    const currency = pkg.currency || 'USD';
    const priceWhole = Math.round(priceInCents / 100);

    // Generate unique transaction identifier
    const txnId = 'ORD_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Create UNPAID payment invoice
    const payRes = await queryDb(
      `INSERT INTO payment (creator_id, package_id, amount_in_cents, currency, payment_method, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID')
       RETURNING *`,
      [creatorId, packageId, priceInCents, currency, paymentMethod, txnId]
    );
    const payment = payRes.rows[0];

    // Metadata for provisioning website upon payment
    const purchaseNotes = JSON.stringify({
      notes: notes || 'Package checkout order',
      subdomain: subdomain || '',
      websiteName: websiteName || '',
      billingInterval: interval,
    });

    // Create UNPAID purchase record linked to payment
    const puRes = await queryDb(
      `INSERT INTO purchases (creator_id, package_id, payment_id, price, amount_in_cents, currency, billing_interval, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'UNPAID', $8)
       RETURNING *`,
      [creatorId, packageId, payment.id, priceWhole, priceInCents, currency, interval, purchaseNotes]
    );
    const purchase = puRes.rows[0];

    // Link payment back to purchase
    await queryDb('UPDATE payment SET purchase_id = $1 WHERE id = $2', [purchase.id, payment.id]);

    // Create initial transaction tracking entry
    await queryDb(
      `INSERT INTO payment_transactions (payment_id, creator_id, purchase_id, transaction_id, gateway, amount_in_cents, currency, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)`,
      [
        payment.id,
        creatorId,
        purchase.id,
        txnId,
        paymentMethod,
        priceInCents,
        currency,
        JSON.stringify({ order_created_at: new Date().toISOString(), package_name: pkg.name }),
      ]
    ).catch((err) => console.warn('Payment transaction log warning:', err.message));

    return NextResponse.json({
      success: true,
      message: 'Order created successfully. Ready for payment.',
      purchase: {
        ...purchase,
        payment_id: payment.id,
      },
      payment: {
        ...payment,
        purchase_id: purchase.id,
      },
      package: pkg,
    });
  }

  // 2. Update Purchase Status
  if (action === 'update_status') {
    const { purchaseId, status } = body;
    if (!purchaseId || !status) {
      return NextResponse.json({ success: false, error: 'Purchase ID and status required' }, { status: 400 });
    }

    const res = await queryDb(
      'UPDATE purchases SET status = $1 WHERE id = $2 AND creator_id = $3 RETURNING *',
      [status, Number(purchaseId), creatorId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Purchase not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, purchase: res.rows[0] });
  }

  return NextResponse.json({ success: false, error: `Unknown purchases action: ${action}` }, { status: 400 });
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    return await handlePurchasesAction(body, sessionCreator);
  } catch (error) {
    console.error('Purchases POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

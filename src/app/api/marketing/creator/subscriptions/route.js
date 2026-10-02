import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

/**
 * API Route: /api/creator/subscriptions
 * Dedicated to the `subscription` table.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : sessionCreator?.id;
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing creator ID' }, { status: 401 });
    }

    if (sessionCreator && sessionCreator.id !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Parallel fetch: active subscription and all historical subscriptions from purchases table
    const [activeSubRes, allSubsRes] = await Promise.all([
      queryDb(
        `SELECT pu.*, 
                pu.period_start AS current_period_start,
                pu.period_end AS current_period_end,
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.description AS package_description, 
                COALESCE(p.monthly_price_usd, p.monthly_price, 0) AS price,
                (COALESCE(p.monthly_price_usd, p.monthly_price, 0) * 100)::int AS price_in_cents, 
                'USD' AS currency, 
                pu.billing_cycle AS billing_interval, 
                COALESCE(p.max_websites, 1) AS max_websites,
                COALESCE(p.max_websites, 1) AS max_portfolios
         FROM purchases pu
         JOIN packages p ON pu.package_id = p.id
         WHERE pu.creator_id = $1 
           AND pu.status IN ('completed', 'active')
           AND (pu.period_end IS NULL OR pu.period_end > CURRENT_TIMESTAMP)
         ORDER BY pu.id DESC LIMIT 1`,
        [creatorId]
      ).catch(() => ({ rows: [] })),
      queryDb(
        `SELECT pu.*, 
                pu.period_start AS current_period_start,
                pu.period_end AS current_period_end,
                p.name AS package_name, 
                p.slug AS package_slug,
                (COALESCE(p.monthly_price_usd, p.monthly_price, 0) * 100)::int AS price_in_cents, 
                pu.billing_cycle AS billing_interval,
                COALESCE(p.max_websites, 1) AS max_websites,
                COALESCE(p.max_websites, 1) AS max_portfolios
         FROM purchases pu
         JOIN packages p ON pu.package_id = p.id
         WHERE pu.creator_id = $1
         ORDER BY pu.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),
    ]);

    const activeSub = activeSubRes.rows[0] || null;
    const subscriptions = allSubsRes.rows;

    let daysRemaining = 0;
    if (activeSub && activeSub.current_period_end) {
      const now = new Date();
      const end = new Date(activeSub.current_period_end);
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      activeSubscription: activeSub,
      subscription: activeSub,
      subscriptions,
      daysRemaining,
      hasActivePackage: Boolean(activeSub && ['completed', 'active'].includes(activeSub.status) && daysRemaining > 0),
    });
  } catch (error) {
    console.error('Subscriptions GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handleSubscriptionsAction(body, sessionCreator) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Creator ID required' }, { status: 401 });
  }

  if (sessionCreator && sessionCreator.id !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Direct purchase subscription action
  if (action === 'purchase_subscription' || action === 'purchase') {
    const packageId = Number(body.packageId);
    const paymentMethod = body.paymentMethod || 'Stripe';

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'Package ID is required.' }, { status: 400 });
    }

    const pkgRes = await queryDb('SELECT * FROM packages WHERE id = $1 LIMIT 1', [packageId]);
    const pkg = pkgRes.rows[0];
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Selected package does not exist.' }, { status: 404 });
    }

    const isYearly = String(pkg.billing_interval || body.billingCycle || '').toLowerCase() === 'yearly';
    const billingCycle = isYearly ? 'yearly' : 'monthly';
    const baseAmount = isYearly ? Number(pkg.yearly_price_usd || pkg.yearly_price || 0) : Number(pkg.monthly_price_usd || pkg.monthly_price || 0);
    const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";
    const purchaseCode = 'PUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    // 1. Insert into purchases table
    const puRes = await queryDb(
      `INSERT INTO purchases (creator_id, package_id, purchase_code, billing_cycle, base_amount, total_amount, status, period_start, period_end, notes)
       VALUES ($1, $2, $3, $4, $5, $5, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval}, $6)
       RETURNING *`,
      [creatorId, packageId, purchaseCode, billingCycle, baseAmount, `Direct purchase of ${pkg.name}`]
    );
    const purchase = puRes.rows[0];

    // 2. Insert into payments table
    const txnId = 'TXN_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const payRes = await queryDb(
      `INSERT INTO payments (purchase_id, creator_id, transaction_id, amount, currency, payment_method, status, payment_date)
       VALUES ($1, $2, $3, $4, 'USD', $5, 'successful', CURRENT_TIMESTAMP)
       RETURNING *`,
      [purchase.id, creatorId, txnId, baseAmount, paymentMethod]
    );

    return NextResponse.json({
      success: true,
      subscription: {
        ...purchase,
        current_period_start: purchase.period_start,
        current_period_end: purchase.period_end,
      },
      purchase,
      payment: payRes.rows[0],
    });
  }

  // Cancel active subscription
  if (action === 'cancel') {
    const subId = Number(body.subscriptionId || body.id);
    const res = await queryDb(
      `UPDATE purchases SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND creator_id = $2 RETURNING *`,
      [subId, creatorId]
    );
    return NextResponse.json({ success: true, subscription: res.rows[0] });
  }

  return NextResponse.json({ success: false, error: `Unknown subscription action: ${action}` }, { status: 400 });
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    return await handleSubscriptionsAction(body, sessionCreator);
  } catch (error) {
    console.error('Subscriptions POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

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

    // Parallel fetch: active subscription and all historical subscriptions
    const [activeSubRes, allSubsRes] = await Promise.all([
      queryDb(
        `SELECT s.*, 
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.description AS package_description, 
                p.price_in_cents, 
                p.currency, 
                p.billing_interval, 
                COALESCE(p.max_websites, p.max_portfolios, 1) AS max_websites,
                p.max_portfolios
         FROM subscription s
         JOIN packages p ON s.package_id = p.id
         WHERE s.creator_id = $1 AND s.status = 'ACTIVE'
         ORDER BY s.id DESC LIMIT 1`,
        [creatorId]
      ),
      queryDb(
        `SELECT s.*, 
                p.name AS package_name, 
                p.price_in_cents, 
                p.billing_interval,
                COALESCE(p.max_websites, p.max_portfolios, 1) AS max_websites,
                p.max_portfolios
         FROM subscription s
         JOIN packages p ON s.package_id = p.id
         WHERE s.creator_id = $1
         ORDER BY s.id DESC`,
        [creatorId]
      ),
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
      hasActivePackage: Boolean(activeSub && activeSub.status === 'ACTIVE' && daysRemaining > 0),
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
    const paymentMethod = body.paymentMethod || 'CARD';

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'Package ID is required.' }, { status: 400 });
    }

    const pkgRes = await queryDb('SELECT * FROM packages WHERE id = $1 LIMIT 1', [packageId]);
    const pkg = pkgRes.rows[0];
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Selected package does not exist.' }, { status: 404 });
    }

    const isYearly = String(pkg.billing_interval).toUpperCase() === 'YEARLY';
    const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";

    const subRes = await queryDb(
      `INSERT INTO subscription (creator_id, package_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval})
       RETURNING *`,
      [creatorId, packageId]
    );
    const subscription = subRes.rows[0];

    const txnId = 'TXN_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const payRes = await queryDb(
      `INSERT INTO payment (creator_id, package_id, subscription_id, amount_in_cents, currency, payment_method, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED')
       RETURNING *`,
      [creatorId, packageId, subscription.id, pkg.price_in_cents, pkg.currency || 'USD', paymentMethod, txnId]
    );

    return NextResponse.json({
      success: true,
      subscription,
      payment: payRes.rows[0],
    });
  }

  // Cancel active subscription
  if (action === 'cancel') {
    const subId = Number(body.subscriptionId);
    const res = await queryDb(
      `UPDATE subscription SET status = 'CANCELLED' WHERE id = $1 AND creator_id = $2 RETURNING *`,
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

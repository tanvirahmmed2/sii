import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { generateToken } from 'src/lib/utils/random';

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : Number(sessionCreator?.id);
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing creator ID' }, { status: 401 });
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await queryDb(
      `INSERT INTO subscriptions (creator_id, package_id, purchase_id, status, billing_cycle, current_period_start, current_period_end)
       SELECT pu.creator_id, pu.package_id, pu.id, 'active', pu.billing_cycle, COALESCE(pu.period_start, pu.created_at), COALESCE(pu.period_end, pu.created_at + INTERVAL '30 days')
       FROM purchases pu
       WHERE pu.creator_id = $1 AND pu.status IN ('completed', 'active')
         AND pu.package_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.purchase_id = pu.id)`,
      [creatorId]
    ).catch(() => {});

    const subsRes = await queryDb(
      `SELECT s.id, s.creator_id, s.package_id, s.purchase_id, s.website_id, s.status,
              s.current_period_start, s.current_period_end,
              s.current_period_start AS period_start,
              s.current_period_end AS period_end,
              s.billing_cycle AS billing_interval,
              s.created_at,
              p.name AS package_name, 
              p.slug AS package_slug, 
              p.tagline AS package_tagline,
              p.description AS package_description, 
              COALESCE(p.monthly_price_usd, p.monthly_price, 0) AS price,
              (COALESCE(p.monthly_price_usd, p.monthly_price, 0) * 100)::int AS price_in_cents, 
              'USD' AS currency, 
              1 AS max_websites,
              1 AS max_portfolios,
              COALESCE(p.max_teachers, 0) AS max_teachers,
              COALESCE(p.max_students, 0) AS max_students,
              COALESCE(p.max_staff, 0) AS max_staff,
              COALESCE(p.max_storage_mb, 5120) AS max_storage_mb,
              pu.purchase_code,
              pu.total_amount,
              pu.status AS purchase_status,
              (SELECT pay.id FROM payments pay WHERE pay.purchase_id = s.purchase_id ORDER BY pay.id DESC LIMIT 1) AS payment_id,
              (SELECT pay.transaction_id FROM payments pay WHERE pay.purchase_id = s.purchase_id ORDER BY pay.id DESC LIMIT 1) AS transaction_id,
              (SELECT COUNT(*)::int FROM websites w WHERE w.creator_id = $1 AND w.subscription_id = s.id) AS websites_count,
              (
                SELECT COALESCE(json_agg(json_build_object(
                  'id', w.id,
                  'name', w.name,
                  'slug', w.slug,
                  'subdomain', COALESCE((SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1), w.slug),
                  'status', w.status,
                  'institution_type', w.institution_type,
                  'created_at', w.created_at
                )), '[]'::json)
                FROM websites w
                WHERE w.creator_id = $1 AND w.subscription_id = s.id
              ) AS provisioned_websites
       FROM subscriptions s
       JOIN packages p ON s.package_id = p.id
       LEFT JOIN purchases pu ON s.purchase_id = pu.id
       WHERE s.creator_id = $1
       ORDER BY s.id DESC`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    const now = new Date();
    const allSubscriptions = subsRes.rows.map((sub) => {
      let daysRemaining = 0;
      if (sub.current_period_end) {
        const end = new Date(sub.current_period_end);
        const diffTime = end.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      const isActiveStatus = ['active', 'completed'].includes(String(sub.status || '').toLowerCase());
      const isPeriodValid = !sub.current_period_end || new Date(sub.current_period_end) > now;
      const is_active = isActiveStatus && isPeriodValid;
      const websitesAllowed = Number(sub.max_websites || 1);
      const websitesUsed = Number(sub.websites_count || 0);
      const websitesRemaining = Math.max(0, websitesAllowed - websitesUsed);

      return {
        ...sub,
        daysRemaining,
        is_active,
        websitesAllowed,
        websitesUsed,
        websitesRemaining,
        canCreateWebsite: is_active && websitesRemaining > 0,
      };
    });

    const activeSubscriptions = allSubscriptions.filter((s) => s.is_active);
    const activeSub = activeSubscriptions[0] || allSubscriptions[0] || null;

    return NextResponse.json({
      success: true,
      activeSubscription: activeSub,
      activeSubscriptions,
      subscription: activeSub,
      subscriptions: allSubscriptions,
      daysRemaining: activeSub?.daysRemaining || 0,
      hasActivePackage: activeSubscriptions.length > 0,
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

  if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (action === 'purchase_subscription' || action === 'purchase') {
    const packageId = Number(body.packageId);
    const paymentMethod = body.paymentMethod || 'Paddle';

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
    const purchaseCode = generateToken(12);

    const puRes = await queryDb(
      `INSERT INTO purchases (creator_id, package_id, purchase_code, billing_cycle, base_amount, total_amount, status, period_start, period_end, notes)
       VALUES ($1, $2, $3, $4, $5, $5, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval}, $6)
       RETURNING *`,
      [creatorId, packageId, purchaseCode, billingCycle, baseAmount, `Direct purchase of ${pkg.name}`]
    );
    const purchase = puRes.rows[0];

    const transactionId = generateToken(12);
    const payRes = await queryDb(
      `INSERT INTO payments (purchase_id, creator_id, transaction_id, amount, currency, payment_method, status, payment_date)
       VALUES ($1, $2, $3, $4, 'USD', $5, 'successful', CURRENT_TIMESTAMP)
       RETURNING *`,
      [purchase.id, creatorId, transactionId, baseAmount, paymentMethod]
    );

    const subRes = await queryDb(
      `INSERT INTO subscriptions (
         creator_id, package_id, purchase_id, status, billing_cycle,
         current_period_start, current_period_end
       ) VALUES (
         $1, $2, $3, 'active', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval}
       ) RETURNING *`,
      [creatorId, packageId, purchase.id, billingCycle]
    );

    await queryDb('DELETE FROM wishlists WHERE creator_id = $1', [creatorId]).catch(() => {});

    return NextResponse.json({
      success: true,
      subscription: {
        ...subRes.rows[0],
        package_name: pkg.name,
        package_slug: pkg.slug,
        max_websites: pkg.max_websites || 1,
      },
      purchase,
      payment: payRes.rows[0],
      wishlistCleared: true,
    });
  }

  if (action === 'renew' || action === 'renew_subscription') {
    const subId = Number(body.subscriptionId || body.id);
    const packageId = Number(body.packageId || 0);

    let queryText = 'SELECT s.*, p.name AS package_name, p.slug AS package_slug, p.monthly_price_usd, p.yearly_price_usd, p.monthly_price_bdt, p.yearly_price_bdt, p.monthly_price, p.yearly_price, 1 AS max_websites FROM subscriptions s JOIN packages p ON s.package_id = p.id WHERE s.creator_id = $1';
    const params = [creatorId];

    if (subId) {
      queryText += ' AND s.id = $2 LIMIT 1';
      params.push(subId);
    } else if (packageId) {
      queryText += ' AND s.package_id = $2 ORDER BY s.id DESC LIMIT 1';
      params.push(packageId);
    } else {
      return NextResponse.json({ success: false, error: 'Subscription ID or Package ID is required for renewal.' }, { status: 400 });
    }

    const subRes = await queryDb(queryText, params);
    const sub = subRes.rows[0];
    if (!sub) {
      return NextResponse.json({ success: false, error: 'Subscription record not found.' }, { status: 404 });
    }

    const isYearly = String(body.billingCycle || sub.billing_cycle || '').toLowerCase() === 'yearly';
    const billingCycle = isYearly ? 'yearly' : 'monthly';
    const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";
    const cleanMethod = String(body.paymentMethod || '').toLowerCase();
    const isBdt = ['surjopay', 'bkash', 'nagad', 'rocket'].includes(cleanMethod) || String(body.currency || '').toUpperCase() === 'BDT';
    const currency = isBdt ? 'BDT' : 'USD';
    const baseAmount = isYearly
      ? Number(isBdt ? (sub.yearly_price_bdt || 0) : (sub.yearly_price_usd || sub.yearly_price || 0))
      : Number(isBdt ? (sub.monthly_price_bdt || 0) : (sub.monthly_price_usd || sub.monthly_price || 0));

    const now = new Date();
    const currentEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
    const isExpired = !currentEnd || currentEnd <= now;

    let updateRes;
    if (isExpired) {
      updateRes = await queryDb(
        `UPDATE subscriptions
         SET status = 'active',
             billing_cycle = $1,
             current_period_start = CURRENT_TIMESTAMP,
             current_period_end = CURRENT_TIMESTAMP + ${durationInterval},
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND creator_id = $3
         RETURNING *`,
        [billingCycle, sub.id, creatorId]
      );
    } else {
      updateRes = await queryDb(
        `UPDATE subscriptions
         SET status = 'active',
             billing_cycle = $1,
             current_period_end = current_period_end + ${durationInterval},
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND creator_id = $3
         RETURNING *`,
        [billingCycle, sub.id, creatorId]
      );
    }

    const updatedSub = updateRes.rows[0];

    const purchaseCode = generateToken(12);
    const puRes = await queryDb(
      `INSERT INTO purchases (
         creator_id, package_id, website_id, purchase_code, billing_cycle,
         base_amount, total_amount, status, period_start, period_end, notes
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $6, 'completed', $7, $8, $9
       ) RETURNING *`,
      [
        creatorId,
        sub.package_id,
        sub.website_id,
        purchaseCode,
        billingCycle,
        baseAmount,
        updatedSub.current_period_start,
        updatedSub.current_period_end,
        `Renewal of ${sub.package_name}`
      ]
    );

    const transactionId = generateToken(12);
    const payRes = await queryDb(
      `INSERT INTO payments (
         purchase_id, creator_id, transaction_id, amount, currency,
         payment_method, status, payment_date
       ) VALUES ($1, $2, $3, $4, $5, $6, 'successful', CURRENT_TIMESTAMP)
       RETURNING *`,
      [puRes.rows[0].id, creatorId, transactionId, baseAmount, currency, body.paymentMethod || 'renewal']
    );

    return NextResponse.json({
      success: true,
      message: isExpired
        ? `Subscription renewed successfully! Period starts from now until ${new Date(updatedSub.current_period_end).toLocaleDateString()}.`
        : `Subscription extended successfully! Extended to ${new Date(updatedSub.current_period_end).toLocaleDateString()}.`,
      subscription: {
        ...updatedSub,
        package_name: sub.package_name,
        package_slug: sub.package_slug,
        max_websites: sub.max_websites || 1,
      },
      purchase: puRes.rows[0],
      payment: payRes.rows[0],
    });
  }

  if (action === 'cancel') {
    const subId = Number(body.subscriptionId || body.id);
    const res = await queryDb(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND creator_id = $2 RETURNING *`,
      [subId, creatorId]
    );
    if (res.rows[0]?.purchase_id) {
      await queryDb(
        `UPDATE purchases SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND creator_id = $2`,
        [res.rows[0].purchase_id, creatorId]
      ).catch(() => {});
    }
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

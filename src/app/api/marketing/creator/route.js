import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

// Table-specific action handlers (reloaded)
import { handleAuthAction } from './auth/route';
import { handleWebsitesAction } from './websites/route';
import { handlePaymentsAction } from './payments/route';
import { handlePurchasesAction } from './purchases/route';
import { handleSubscriptionsAction } from './subscriptions/route';
import { handleProfileAction } from './profile/route';
import { handleSupportAction } from './support/route';

/**
 * Main Creator Dashboard API Router
 * Aggregates dashboard data on GET and dispatches table actions on POST.
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const sessionCreator = await getCreatorSession(request);
    if (!sessionCreator) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Valid creator session required',
      }, { status: 401 });
    }

    const sessionCreatorId = Number(sessionCreator.id);
    let creator = sessionCreator;
    let redirectUrl = null;

    if (creatorIdParam && !isNaN(Number(creatorIdParam))) {
      const requestedId = Number(creatorIdParam);
      if (requestedId !== sessionCreatorId) {
        redirectUrl = `/creator/${sessionCreatorId}`;
      }
    }

    if (!creator) {
      return NextResponse.json({
        success: false,
        error: 'Creator not found',
        creator: null,
        packages: [],
      }, { status: 404 });
    }

    const creatorId = creator.id;

    // Auto-sync any completed purchases without a subscription row
    await queryDb(
      `INSERT INTO subscriptions (creator_id, package_id, purchase_id, status, billing_cycle, current_period_start, current_period_end)
       SELECT pu.creator_id, pu.package_id, pu.id, 'active', pu.billing_cycle, COALESCE(pu.period_start, pu.created_at), COALESCE(pu.period_end, pu.created_at + INTERVAL '30 days')
       FROM purchases pu
       WHERE pu.creator_id = $1 AND pu.status IN ('completed', 'active')
         AND pu.package_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.purchase_id = pu.id)`,
      [creatorId]
    ).catch(() => {});

    // Fetch subscriptions, pending orders, websites, and payments
    const [
      allSubsRes,
      pendingSubRes,
      pendingPurchaseRes,
      websitesRes,
      paymentsRes,
      packagesRes,
      ticketsRes,
      purchasesRes,
    ] = await Promise.all([
      // 1. All subscriptions for this creator with linked package, purchase, payment, and website counts
      queryDb(
        `SELECT s.id, s.creator_id, s.package_id, s.purchase_id, s.status,
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
                COALESCE(p.max_websites, 1) AS max_websites,
                COALESCE(p.max_websites, 1) AS max_portfolios,
                COALESCE(p.max_teachers, 0) AS max_teachers,
                COALESCE(p.max_students, 0) AS max_students,
                COALESCE(p.max_staff, 0) AS max_staff,
                COALESCE(p.max_storage_mb, 5120) AS max_storage_mb,
                pu.purchase_code,
                pu.total_amount,
                pu.status AS purchase_status,
                (SELECT pay.id FROM payments pay WHERE pay.purchase_id = s.purchase_id ORDER BY pay.id DESC LIMIT 1) AS payment_id,
                (SELECT pay.transaction_id FROM payments pay WHERE pay.purchase_id = s.purchase_id ORDER BY pay.id DESC LIMIT 1) AS transaction_id,
                (SELECT COUNT(*)::int FROM websites w WHERE w.creator_id = $1 AND (w.subscription_id = s.id OR (w.subscription_id IS NULL AND w.package_id = s.package_id))) AS websites_count
         FROM subscriptions s
         JOIN packages p ON s.package_id = p.id
         LEFT JOIN purchases pu ON s.purchase_id = pu.id
         WHERE s.creator_id = $1
         ORDER BY s.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 2. Pending or unpaid subscription order
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
                pu.billing_cycle AS billing_interval
         FROM purchases pu
         JOIN packages p ON pu.package_id = p.id
         WHERE pu.creator_id = $1 AND pu.status IN ('pending', 'UNPAID')
         ORDER BY pu.id DESC LIMIT 1`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 3. Pending purchase order (fallback)
      queryDb(
        `SELECT pu.*, 
                p.name AS package_name, 
                p.slug AS package_slug, 
                (COALESCE(p.monthly_price_usd, p.monthly_price, 0) * 100)::int AS price_in_cents
         FROM purchases pu
         JOIN packages p ON pu.package_id = p.id
         WHERE pu.creator_id = $1 AND pu.status IN ('pending', 'UNPAID')
         ORDER BY pu.id DESC LIMIT 1`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 4. Creator websites
      queryDb(
        `SELECT w.id, w.name, w.slug, w.subdomain, w.custom_domain, w.status,
                (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published,
                w.is_maintenance_mode, w.logo, w.theme, w.primary_color,
                w.package_id, w.subscription_id,
                p.name AS package_name
         FROM websites w
         LEFT JOIN packages p ON w.package_id = p.id
         WHERE w.creator_id = $1
         ORDER BY w.id DESC LIMIT 50`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 5. Creator payments
      queryDb(
        `SELECT pay.*, 
                (pay.amount * 100)::bigint AS amount_in_cents,
                p.name AS package_name, 
                p.slug AS package_slug, 
                pu.billing_cycle AS billing_interval
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.creator_id = $1
         ORDER BY pay.id DESC LIMIT 50`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 6. Available packages catalog
      queryDb(
        `SELECT id, name, slug, tagline, description, monthly_price_usd, yearly_price_usd,
                monthly_price_bdt, yearly_price_bdt,
                COALESCE(monthly_price_usd, monthly_price, 0) AS monthly_price,
                (COALESCE(monthly_price_usd, monthly_price, 0) * 100)::bigint AS price_in_cents,
                discount_percentage, max_students, max_teachers, max_staff, max_storage_mb,
                COALESCE(max_websites, 1) AS max_websites,
                features, is_popular, is_active, grace_period, sort_order
         FROM packages
         WHERE is_active = TRUE AND is_public = TRUE
         ORDER BY sort_order ASC, monthly_price_usd ASC, id ASC`
      ).catch(() => ({ rows: [] })),

      // 7. Creator support tickets
      queryDb(
        `SELECT s.id, s.creator_id, s.ticket_number, s.subject, s.status, s.priority,
                'General' AS category, s.created_at, s.updated_at,
                (SELECT COUNT(*)::int FROM support_messages WHERE support_id = s.id) AS message_count,
                (SELECT message FROM support_messages WHERE support_id = s.id ORDER BY id DESC LIMIT 1) AS last_message
         FROM supports s
         WHERE s.creator_id = $1
         ORDER BY s.id DESC LIMIT 20`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 8. Creator purchases
      queryDb(
        `SELECT pu.*, 
                (pu.total_amount * 100)::bigint AS amount_in_cents, 
                p.name AS package_name, 
                p.slug AS package_slug
         FROM purchases pu
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pu.creator_id = $1
         ORDER BY pu.id DESC LIMIT 20`,
        [creatorId]
      ).catch(() => ({ rows: [] })),
    ]);

    const now = new Date();
    const rawSubs = allSubsRes.rows || [];

    // Enrich subscriptions with days remaining and active flag
    const allSubscriptions = rawSubs.map((sub) => {
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

    const pendingSub =
      pendingSubRes.rows[0] ||
      (pendingPurchaseRes?.rows[0]
        ? {
            id: pendingPurchaseRes.rows[0].id,
            package_name: pendingPurchaseRes.rows[0].package_name,
            package_slug: pendingPurchaseRes.rows[0].package_slug,
            price_in_cents: pendingPurchaseRes.rows[0].price_in_cents,
            status: pendingPurchaseRes.rows[0].status || 'pending',
            currency: 'USD',
            billing_interval: 'monthly',
          }
        : null);

    const websites = websitesRes.rows || [];
    const payments = paymentsRes?.rows || [];
    const packages = packagesRes?.rows || [];
    const tickets = ticketsRes?.rows || [];
    const purchases = purchasesRes?.rows || [];

    let totalSpentUsd = 0;
    let totalSpentBdt = 0;
    for (const p of payments) {
      if (['successful', 'completed'].includes(p.status?.toLowerCase())) {
        const amt = Number(p.amount || 0);
        const curr = (p.currency || (p.payment_method === 'BKASH' ? 'BDT' : 'USD')).toUpperCase();
        if (curr === 'BDT') {
          totalSpentBdt += amt;
        } else {
          totalSpentUsd += amt;
        }
      }
    }

    const maxWebsitesTotal = activeSubscriptions.reduce((acc, s) => acc + (s.websitesAllowed || 1), 0);

    return NextResponse.json({
      success: true,
      creator,
      redirectUrl,
      activeSubscription: activeSub,
      activeSubscriptions,
      pendingSubscription: pendingSub,
      subscription: activeSub,
      subscriptions: allSubscriptions,
      websites,
      payments,
      purchases,
      packages,
      tickets,
      projects: [],
      updates: [],
      creators: [],
      stats: {
        totalWebsites: websites.length,
        maxWebsites: activeSub?.websitesAllowed ?? activeSub?.max_websites ?? 1,
        maxWebsitesTotal: maxWebsitesTotal || 1,
        totalSubscriptions: allSubscriptions.length,
        activeSubscriptionsCount: activeSubscriptions.length,
        daysRemaining: activeSub?.daysRemaining || 0,
        totalSpentUsd,
        totalSpentBdt,
        hasActivePackage: activeSubscriptions.length > 0,
        hasPendingSubscription: Boolean(pendingSub),
      },
    });
  } catch (error) {
    console.error('Creator GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Auth Actions (creators table)
    const authActions = ['register', 'verify', 'resend_verification', 'login', 'logout', 'me', 'recover', 'reset_password'];
    if (authActions.includes(action)) {
      return await handleAuthAction(body, request);
    }

    // Get session creator for authenticated actions
    const sessionCreator = await getCreatorSession(request);

    // 2. Website Actions (websites table)
    const websiteActions = ['create_website', 'setup_website', 'update_website', 'delete_website', 'check_domain'];
    if (websiteActions.includes(action)) {
      return await handleWebsitesAction(body, sessionCreator, request);
    }

    // 3. Purchase Actions (purchases table)
    const purchaseActions = ['create_order', 'update_status'];
    if (purchaseActions.includes(action)) {
      return await handlePurchasesAction(body, sessionCreator);
    }

    // 4. Payment Actions (payment table)
    const paymentActions = ['pay_invoice', 'pay'];
    if (paymentActions.includes(action)) {
      return await handlePaymentsAction(body, sessionCreator, request);
    }

    // 5. Subscription Actions (subscription table)
    const subscriptionActions = ['purchase_subscription', 'cancel'];
    if (subscriptionActions.includes(action)) {
      return await handleSubscriptionsAction(body, sessionCreator);
    }

    // 6. Profile & Security Actions (creators table)
    const profileActions = ['update_profile', 'change_password', 'toggle_2fa', 'list_sessions', 'revoke_session', 'revoke_other_sessions'];
    if (profileActions.includes(action)) {
      return await handleProfileAction(body, sessionCreator);
    }

    // 7. Support Actions (support & support_messages tables)
    const supportActions = ['create_ticket', 'add_message'];
    if (supportActions.includes(action)) {
      return await handleSupportAction(body, sessionCreator);
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Creator POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

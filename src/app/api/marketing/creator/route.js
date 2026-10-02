import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

// Table-specific action handlers
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

    let creator = sessionCreator;
    if (creatorIdParam && !isNaN(Number(creatorIdParam))) {
      if (Number(creatorIdParam) !== sessionCreator.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden: Access to another creator profile is restricted',
        }, { status: 403 });
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

    // Fetch active subscription, pending/unpaid subscription, websites, and payments
    const [
      activeSubRes,
      pendingSubRes,
      pendingPurchaseRes,
      websitesRes,
      paymentsRes,
    ] = await Promise.all([
      // 1. Active subscription (from purchases table where status is completed/active and period_end > NOW)
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
        `SELECT id, name, slug, subdomain, custom_domain, status,
                (CASE WHEN status = 'active' AND is_maintenance_mode = false THEN true ELSE false END) AS is_published,
                is_maintenance_mode, logo, theme, primary_color
         FROM websites
         WHERE creator_id = $1
         ORDER BY id DESC LIMIT 20`,
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
                features, is_popular, is_active, trial_days, sort_order
         FROM packages
         WHERE is_active = TRUE
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

    const activeSub = activeSubRes.rows[0] || null;
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

    // Calculate days remaining
    let daysRemaining = 0;
    if (activeSub && activeSub.current_period_end) {
      const now = new Date();
      const end = new Date(activeSub.current_period_end);
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const totalSpentCents = payments.reduce(
      (acc, p) => acc + (p.status === 'successful' || p.status === 'COMPLETED' ? Number(p.amount_in_cents || (Number(p.amount || 0) * 100)) : 0),
      0
    );

    return NextResponse.json({
      success: true,
      creator,
      activeSubscription: activeSub,
      pendingSubscription: pendingSub,
      subscription: activeSub,
      subscriptions: activeSub ? [activeSub] : pendingSub ? [pendingSub] : [],
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
        maxWebsites: activeSub?.max_websites ?? activeSub?.max_portfolios ?? 1,
        daysRemaining,
        totalSpentCents,
        hasActivePackage: Boolean(activeSub && (activeSub.status === 'completed' || activeSub.status === 'active' || activeSub.status === 'ACTIVE') && daysRemaining > 0),
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
    const websiteActions = ['create_website', 'setup_website', 'update_website', 'delete_website'];
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
    const profileActions = ['update_profile', 'change_password', 'toggle_2fa'];
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

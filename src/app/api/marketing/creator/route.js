import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

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
      // 1. Active subscription
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
      ).catch(() => ({ rows: [] })),

      // 2. Pending or unpaid subscription
      queryDb(
        `SELECT s.*, 
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.description AS package_description, 
                p.price_in_cents, 
                p.currency, 
                p.billing_interval
         FROM subscription s
         JOIN packages p ON s.package_id = p.id
         WHERE s.creator_id = $1 AND s.status IN ('PENDING', 'UNPAID', 'OVERDUE')
         ORDER BY s.id DESC LIMIT 1`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 3. Pending purchase order
      queryDb(
        `SELECT pu.*, 
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.price_in_cents
         FROM purchases pu
         JOIN packages p ON pu.package_id = p.id
         WHERE pu.creator_id = $1 AND pu.status IN ('PENDING', 'UNPAID')
         ORDER BY pu.id DESC LIMIT 1`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 4. Creator websites
      queryDb(
        `SELECT id, name, subdomain, is_published, custom_domain
         FROM websites
         WHERE creator_id = $1
         ORDER BY id DESC LIMIT 20`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      // 5. Creator payments
      queryDb(
        `SELECT pay.*, p.name AS package_name, p.slug AS package_slug, p.billing_interval
         FROM payment pay
         LEFT JOIN packages p ON pay.package_id = p.id
         WHERE pay.creator_id = $1
         ORDER BY pay.id DESC LIMIT 50`,
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
            status: pendingPurchaseRes.rows[0].status || 'PENDING',
            currency: 'USD',
            billing_interval: 'MONTHLY',
          }
        : null);

    const websites = websitesRes.rows || [];
    const payments = paymentsRes?.rows || [];

    // Calculate days remaining
    let daysRemaining = 0;
    if (activeSub && activeSub.current_period_end) {
      const now = new Date();
      const end = new Date(activeSub.current_period_end);
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      creator,
      activeSubscription: activeSub,
      pendingSubscription: pendingSub,
      subscription: activeSub,
      subscriptions: activeSub ? [activeSub] : pendingSub ? [pendingSub] : [],
      websites,
      payments,
      purchases: [],
      packages: [],
      tickets: [],
      projects: [],
      updates: [],
      creators: [],
      stats: {
        totalWebsites: websites.length,
        maxWebsites: activeSub?.max_websites ?? activeSub?.max_portfolios ?? 0,
        daysRemaining,
        hasActivePackage: Boolean(activeSub && activeSub.status === 'ACTIVE' && daysRemaining > 0),
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

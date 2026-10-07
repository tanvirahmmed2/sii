import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { generateToken } from 'src/lib/utils/random';

/**
 * Helper to fetch complete subscription details by ID or purchase ID
 */
async function fetchFullSubscription(idNum) {
  // 1. Try by subscriptions.id first
  let subRes = await queryDb(
    `SELECT s.*,
            pu.id AS purchase_id,
            pu.purchase_code,
            pu.billing_cycle AS purchase_billing_cycle,
            pu.base_amount,
            pu.discount_amount,
            pu.tax_amount,
            pu.total_amount,
            pu.status AS purchase_status,
            pu.period_start AS purchase_period_start,
            pu.period_end AS purchase_period_end,
            pu.notes AS purchase_notes,
            pu.invoice_pdf_url,
            c.id AS creator_id,
            c.name AS creator_name,
            c.email AS creator_email,
            c.phone AS creator_phone,
            c.institution AS creator_institution,
            c.country AS creator_country,
            c.city AS creator_city,
            c.address AS creator_address,
            c.is_active AS creator_is_active,
            c.email_verified AS creator_email_verified,
            p.id AS package_id,
            p.name AS package_name,
            p.slug AS package_slug,
            p.tagline AS package_tagline,
            p.description AS package_description,
            p.monthly_price_usd,
            p.yearly_price_usd,
            p.monthly_price_bdt,
            p.yearly_price_bdt,
            p.discount_percentage,
            p.max_students,
            p.max_teachers,
            p.max_staff,
            p.max_storage_mb,
            p.max_websites,
            p.features AS package_features,
            p.grace_period AS package_grace_period,
            p.is_public AS package_is_public,
            w.id AS website_id,
            w.name AS website_name,
            w.slug AS website_slug,
            w.subdomain AS website_subdomain,
            w.custom_domain AS website_custom_domain,
            w.custom_domain_verified AS website_custom_domain_verified,
            w.status AS website_status,
            w.theme AS website_theme,
            w.primary_color AS website_primary_color,
            w.secondary_color AS website_secondary_color,
            w.institution_type AS website_institution_type,
            w.eiin_number AS website_eiin_number,
            w.storage_used_mb AS website_storage_used_mb,
            w.is_maintenance_mode AS website_is_maintenance_mode,
            w.subscription_expires_at AS website_subscription_expires_at,
            pay.id AS payment_id,
            pay.transaction_id,
            pay.amount AS payment_amount,
            pay.currency AS payment_currency,
            pay.payment_method,
            pay.payment_gateway,
            pay.status AS payment_status,
            pay.payment_date
     FROM subscriptions s
     LEFT JOIN purchases pu ON s.purchase_id = pu.id
     LEFT JOIN packages p ON COALESCE(s.package_id, pu.package_id) = p.id
     LEFT JOIN creators c ON COALESCE(s.creator_id, pu.creator_id) = c.id
     LEFT JOIN websites w ON COALESCE(s.website_id, pu.website_id) = w.id
     LEFT JOIN LATERAL (
       SELECT * FROM payments WHERE purchase_id = pu.id ORDER BY id DESC LIMIT 1
     ) pay ON true
     WHERE s.id = $1
     LIMIT 1`,
    [idNum]
  ).catch(() => ({ rows: [] }));

  // 2. If not found by subscriptions.id, try finding where s.purchase_id = idNum OR pu.id = idNum
  if (subRes.rows.length === 0) {
    subRes = await queryDb(
      `SELECT COALESCE(s.id, pu.id) AS id,
              s.id AS subscription_table_id,
              s.current_period_start,
              s.current_period_end,
              s.cancel_at_period_end,
              COALESCE(s.status, CASE WHEN pu.status = 'completed' THEN 'active' ELSE 'past_due' END) AS status,
              COALESCE(s.billing_cycle, pu.billing_cycle) AS billing_cycle,
              s.created_at,
              s.updated_at,
              pu.id AS purchase_id,
              pu.purchase_code,
              pu.billing_cycle AS purchase_billing_cycle,
              pu.base_amount,
              pu.discount_amount,
              pu.tax_amount,
              pu.total_amount,
              pu.status AS purchase_status,
              pu.period_start AS purchase_period_start,
              pu.period_end AS purchase_period_end,
              pu.notes AS purchase_notes,
              pu.invoice_pdf_url,
              c.id AS creator_id,
              c.name AS creator_name,
              c.email AS creator_email,
              c.phone AS creator_phone,
              c.institution AS creator_institution,
              c.country AS creator_country,
              c.city AS creator_city,
              c.address AS creator_address,
              c.is_active AS creator_is_active,
              c.email_verified AS creator_email_verified,
              p.id AS package_id,
              p.name AS package_name,
              p.slug AS package_slug,
              p.tagline AS package_tagline,
              p.description AS package_description,
              p.monthly_price_usd,
              p.yearly_price_usd,
              p.monthly_price_bdt,
              p.yearly_price_bdt,
              p.discount_percentage,
              p.max_students,
              p.max_teachers,
              p.max_staff,
              p.max_storage_mb,
              p.max_websites,
              p.features AS package_features,
              p.grace_period AS package_grace_period,
              p.is_public AS package_is_public,
              w.id AS website_id,
              w.name AS website_name,
              w.slug AS website_slug,
              w.subdomain AS website_subdomain,
              w.custom_domain AS website_custom_domain,
              w.custom_domain_verified AS website_custom_domain_verified,
              w.status AS website_status,
              w.theme AS website_theme,
              w.primary_color AS website_primary_color,
              w.secondary_color AS website_secondary_color,
              w.institution_type AS website_institution_type,
              w.eiin_number AS website_eiin_number,
              w.storage_used_mb AS website_storage_used_mb,
              w.is_maintenance_mode AS website_is_maintenance_mode,
              w.subscription_expires_at AS website_subscription_expires_at,
              pay.id AS payment_id,
              pay.transaction_id,
              pay.amount AS payment_amount,
              pay.currency AS payment_currency,
              pay.payment_method,
              pay.payment_gateway,
              pay.status AS payment_status,
              pay.payment_date
       FROM purchases pu
       LEFT JOIN subscriptions s ON s.purchase_id = pu.id
       LEFT JOIN packages p ON COALESCE(s.package_id, pu.package_id) = p.id
       LEFT JOIN creators c ON COALESCE(s.creator_id, pu.creator_id) = c.id
       LEFT JOIN websites w ON COALESCE(s.website_id, pu.website_id) = w.id
       LEFT JOIN LATERAL (
         SELECT * FROM payments WHERE purchase_id = pu.id ORDER BY id DESC LIMIT 1
       ) pay ON true
       WHERE pu.id = $1 OR s.purchase_id = $1
       LIMIT 1`,
      [idNum]
    ).catch(() => ({ rows: [] }));
  }

  return subRes.rows[0] || null;
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const resolvedParams = await params;
    const subId = Number(resolvedParams?.id);
    if (!subId || isNaN(subId)) {
      return NextResponse.json({ success: false, error: 'Invalid subscription ID' }, { status: 400 });
    }

    const subscription = await fetchFullSubscription(subId);
    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }

    const creatorId = Number(subscription.creator_id);
    const purchaseId = Number(subscription.purchase_id);

    // Parallel fetch related lists:
    // 1. Payments linked to this purchase or creator
    // 2. All purchases for this creator
    // 3. Available packages
    // 4. Websites owned by this creator
    const [paymentsRes, purchasesRes, packagesRes, websitesRes] = await Promise.all([
      queryDb(
        `SELECT pay.*, 
                pu.purchase_code,
                pu.billing_cycle,
                p.name AS package_name
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE (pay.purchase_id = $1 OR (pay.creator_id = $2 AND $2 IS NOT NULL))
         ORDER BY pay.id DESC LIMIT 30`,
        [purchaseId || 0, creatorId || 0]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT pu.*, 
                p.name AS package_name, 
                p.slug AS package_slug,
                pay.transaction_id, 
                pay.payment_method, 
                pay.status AS payment_status,
                pay.currency AS payment_currency
         FROM purchases pu
         LEFT JOIN packages p ON pu.package_id = p.id
         LEFT JOIN LATERAL (
           SELECT * FROM payments WHERE purchase_id = pu.id ORDER BY id DESC LIMIT 1
         ) pay ON true
         WHERE pu.creator_id = $1
         ORDER BY pu.id DESC LIMIT 30`,
        [creatorId || 0]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, name, slug, tagline, description,
                monthly_price_usd, yearly_price_usd, monthly_price_bdt, yearly_price_bdt,
                discount_percentage, max_students, max_teachers, max_staff, max_storage_mb, max_websites,
                features, is_active, is_public
         FROM packages
         WHERE is_active = TRUE
         ORDER BY COALESCE(monthly_price_usd, 0) ASC, id ASC`
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, creator_id, name, slug, subdomain, custom_domain, status, storage_used_mb,
                subscription_expires_at, is_maintenance_mode, primary_color, secondary_color, created_at
         FROM websites
         WHERE creator_id = $1
         ORDER BY id DESC`,
        [creatorId || 0]
      ).catch(() => ({ rows: [] })),
    ]);

    // Calculate days remaining
    let daysRemaining = 0;
    const periodEnd = subscription.current_period_end || subscription.purchase_period_end;
    if (periodEnd) {
      const diff = new Date(periodEnd).getTime() - Date.now();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        days_remaining: daysRemaining,
        is_expired: daysRemaining < 0,
      },
      creator: {
        id: subscription.creator_id,
        name: subscription.creator_name,
        email: subscription.creator_email,
        phone: subscription.creator_phone,
        institution: subscription.creator_institution,
        country: subscription.creator_country,
        city: subscription.creator_city,
        address: subscription.creator_address,
        is_active: subscription.creator_is_active,
        email_verified: subscription.creator_email_verified,
      },
      package: {
        id: subscription.package_id,
        name: subscription.package_name,
        slug: subscription.package_slug,
        tagline: subscription.package_tagline,
        description: subscription.package_description,
        monthly_price_usd: subscription.monthly_price_usd,
        yearly_price_usd: subscription.yearly_price_usd,
        monthly_price_bdt: subscription.monthly_price_bdt,
        yearly_price_bdt: subscription.yearly_price_bdt,
        discount_percentage: subscription.discount_percentage,
        max_students: subscription.max_students,
        max_teachers: subscription.max_teachers,
        max_staff: subscription.max_staff,
        max_storage_mb: subscription.max_storage_mb,
        max_websites: subscription.max_websites,
        features: subscription.package_features,
        grace_period: subscription.package_grace_period,
        is_public: subscription.package_is_public,
      },
      website: subscription.website_id ? {
        id: subscription.website_id,
        name: subscription.website_name,
        slug: subscription.website_slug,
        subdomain: subscription.website_subdomain,
        custom_domain: subscription.website_custom_domain,
        custom_domain_verified: subscription.website_custom_domain_verified,
        status: subscription.website_status,
        theme: subscription.website_theme,
        primary_color: subscription.website_primary_color,
        secondary_color: subscription.website_secondary_color,
        institution_type: subscription.website_institution_type,
        eiin_number: subscription.website_eiin_number,
        storage_used_mb: subscription.website_storage_used_mb,
        is_maintenance_mode: subscription.website_is_maintenance_mode,
        subscription_expires_at: subscription.website_subscription_expires_at,
      } : null,
      payments: paymentsRes.rows,
      purchases: purchasesRes.rows,
      available_packages: packagesRes.rows,
      creator_websites: websitesRes.rows,
    });
  } catch (error) {
    console.error('Subscription [id] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST handler for actions on Subscription:
 * - action: 'renew' (Renew subscription with full payment handling)
 * - action: 'update_status' (Toggle status / cancel_at_period_end)
 */
export async function POST(request, { params }) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const resolvedParams = await params;
    const subId = Number(resolvedParams?.id);
    if (!subId || isNaN(subId)) {
      return NextResponse.json({ success: false, error: 'Invalid subscription ID' }, { status: 400 });
    }

    const currentSub = await fetchFullSubscription(subId);
    if (!currentSub) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action || 'renew';

    // ------------------------------------------------------------------------
    // ACTION 1: RENEW SUBSCRIPTION (HANDLES PAYMENT & PURCHASE RENEWAL)
    // ------------------------------------------------------------------------
    if (action === 'renew') {
      const creatorId = Number(currentSub.creator_id);
      const selectedPkgId = Number(body.package_id || currentSub.package_id);

      // Verify Package
      const pkgRes = await queryDb('SELECT * FROM packages WHERE id = $1 LIMIT 1', [selectedPkgId]);
      const pkg = pkgRes.rows[0];
      if (!pkg) {
        return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
      }

      // Calculate Duration and Period Dates
      // duration_type: 'monthly', 'yearly', 'multiple_months', 'multiple_years', 'custom'
      const durationType = (body.duration_type || 'monthly').toLowerCase();
      const durationMultiplier = Math.max(1, parseInt(body.duration_multiplier, 10) || 1);
      const extendFrom = body.extend_from || 'period_end'; // 'period_end' or 'now'

      const now = new Date();
      let periodStart = new Date();

      // Check current expiration
      const currentEnd = currentSub.current_period_end || currentSub.purchase_period_end;
      if (extendFrom === 'period_end' && currentEnd && new Date(currentEnd) > now) {
        periodStart = new Date(currentEnd);
      }

      let periodEnd = new Date(periodStart);
      let billingCycle = 'monthly';
      let monthsSpan = 1;

      if (durationType === 'yearly') {
        billingCycle = 'yearly';
        monthsSpan = 12;
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (durationType === 'multiple_years') {
        billingCycle = 'yearly';
        monthsSpan = durationMultiplier * 12;
        periodEnd.setFullYear(periodEnd.getFullYear() + durationMultiplier);
      } else if (durationType === 'multiple_months') {
        monthsSpan = durationMultiplier;
        billingCycle = monthsSpan === 12 ? 'yearly' : 'custom';
        periodEnd.setMonth(periodEnd.getMonth() + monthsSpan);
      } else if (durationType === 'custom' && body.custom_period_end) {
        billingCycle = 'custom';
        periodEnd = new Date(body.custom_period_end);
      } else {
        // default 1 month
        billingCycle = 'monthly';
        monthsSpan = 1;
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Amount & Currency
      const currency = (body.currency || 'USD').toUpperCase();
      let calculatedAmount = 0;

      if (body.amount !== undefined && body.amount !== '' && !isNaN(Number(body.amount))) {
        calculatedAmount = Math.max(0, Number(body.amount));
      } else {
        const isYearly = durationType === 'yearly' || durationType === 'multiple_years';
        const yearCount = durationType === 'multiple_years' ? durationMultiplier : 1;

        if (currency === 'BDT') {
          if (isYearly) {
            calculatedAmount = Number(pkg.yearly_price_bdt || 0) * yearCount;
          } else {
            calculatedAmount = Number(pkg.monthly_price_bdt || 0) * monthsSpan;
          }
        } else {
          if (isYearly) {
            calculatedAmount = Number(pkg.yearly_price_usd || pkg.yearly_price || 0) * yearCount;
          } else {
            calculatedAmount = Number(pkg.monthly_price_usd || pkg.monthly_price || 0) * monthsSpan;
          }
        }
      }

      // Payment Handling: PAID vs UNPAID
      const isPaid =
        String(body.payment_status || '').toUpperCase() === 'PAID' ||
        Boolean(body.is_paid) === true;

      const purchaseCode = generateToken(12);
      const transactionId = (body.transaction_id || generateToken(14)).trim();
      const rawMethod = String(body.payment_method || '').toUpperCase();
      let paymentMethod = 'bKash';
      let paymentGateway = 'BKASH';

      if (rawMethod === 'PADDLE') {
        paymentGateway = 'PADDLE';
        paymentMethod = 'Paddle';
      } else {
        paymentGateway = 'BKASH';
        paymentMethod = 'bKash';
      }
      const notes = (body.notes || `Subscription renewed for ${pkg.name} (${billingCycle})`).trim();

      const purchaseStatus = isPaid ? 'completed' : 'pending';
      const paymentStatus = isPaid ? 'successful' : 'pending';
      const subStatus = isPaid ? 'active' : 'past_due';

      // 1. Insert Renewal Purchase Record
      const puRes = await queryDb(
        `INSERT INTO purchases (
          creator_id, website_id, package_id, purchase_code, billing_cycle,
          base_amount, discount_amount, tax_amount, total_amount,
          status, period_start, period_end, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, 0.00, 0.00, $6,
          $7, $8, $9, $10
        )
        RETURNING *`,
        [
          creatorId,
          currentSub.website_id || null,
          selectedPkgId,
          purchaseCode,
          billingCycle,
          calculatedAmount,
          purchaseStatus,
          periodStart,
          periodEnd,
          notes,
        ]
      );
      const newPurchase = puRes.rows[0];

      // 2. Insert Payment Record
      const payRes = await queryDb(
        `INSERT INTO payments (
          purchase_id, creator_id, transaction_id, amount, currency,
          payment_method, payment_gateway, status, payment_date
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9
        )
        RETURNING *`,
        [
          newPurchase.id,
          creatorId,
          transactionId,
          calculatedAmount,
          currency,
          paymentMethod,
          paymentGateway,
          paymentStatus,
          isPaid ? new Date() : null,
        ]
      );
      const newPayment = payRes.rows[0];

      // 3. Update or Insert Subscriptions Record
      let updatedSub = null;
      if (currentSub.subscription_table_id || currentSub.id) {
        const actualSubId = currentSub.subscription_table_id || currentSub.id;
        const subRes = await queryDb(
          `UPDATE subscriptions
           SET package_id = $1,
               purchase_id = $2,
               billing_cycle = $3,
               status = CASE WHEN $4 = TRUE THEN 'active' ELSE status END,
               current_period_start = CASE WHEN $4 = TRUE THEN $5 ELSE current_period_start END,
               current_period_end = CASE WHEN $4 = TRUE THEN $6 ELSE current_period_end END,
               cancel_at_period_end = FALSE,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $7
           RETURNING *`,
          [selectedPkgId, newPurchase.id, billingCycle, isPaid, periodStart, periodEnd, actualSubId]
        );
        updatedSub = subRes.rows[0];
      } else {
        // Create subscriptions entry if not existing
        const subRes = await queryDb(
          `INSERT INTO subscriptions (
            creator_id, package_id, website_id, purchase_id, status, billing_cycle,
            current_period_start, current_period_end, cancel_at_period_end
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, FALSE
          )
          RETURNING *`,
          [
            creatorId,
            selectedPkgId,
            currentSub.website_id || null,
            newPurchase.id,
            subStatus,
            billingCycle,
            periodStart,
            periodEnd,
          ]
        );
        updatedSub = subRes.rows[0];
      }

      // 4. Update Website Expiration if website exists and payment is successful
      if (isPaid) {
        if (currentSub.website_id) {
          await queryDb(
            `UPDATE websites
             SET subscription_expires_at = $1, subscription_id = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [periodEnd, updatedSub?.id || null, currentSub.website_id]
          ).catch(() => {});
        } else {
          // Update all websites for this creator
          await queryDb(
            `UPDATE websites
             SET subscription_expires_at = $1, subscription_id = $2, updated_at = CURRENT_TIMESTAMP
             WHERE creator_id = $3`,
            [periodEnd, updatedSub?.id || null, creatorId]
          ).catch(() => {});
        }
      }

      const refreshed = await fetchFullSubscription(subId);

      return NextResponse.json({
        success: true,
        message: isPaid
          ? `Subscription renewed successfully for "${pkg.name}". Payment recorded as PAID.`
          : `Renewal invoice issued for "${pkg.name}". Pending payment from creator.`,
        purchase: newPurchase,
        payment: newPayment,
        subscription: refreshed || updatedSub,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: UPDATE STATUS (ACTIVE, PAST_DUE, CANCELLED, EXPIRED)
    // ------------------------------------------------------------------------
    if (action === 'update_status') {
      const newStatus = (body.status || '').toLowerCase();
      const validStatuses = ['active', 'trailing', 'past_due', 'cancelled', 'expired'];
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid subscription status value' }, { status: 400 });
      }

      const actualSubId = currentSub.subscription_table_id || currentSub.id;
      const res = await queryDb(
        `UPDATE subscriptions
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [newStatus, actualSubId]
      );

      // If cancelled or expired, also update website status if appropriate
      if (newStatus === 'expired' && currentSub.website_id) {
        await queryDb(`UPDATE websites SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [currentSub.website_id]).catch(() => {});
      }

      const refreshed = await fetchFullSubscription(subId);
      return NextResponse.json({
        success: true,
        message: `Subscription status updated to "${newStatus}".`,
        subscription: refreshed || res.rows[0],
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 3: TOGGLE CANCEL AT PERIOD END
    // ------------------------------------------------------------------------
    if (action === 'toggle_cancel') {
      const actualSubId = currentSub.subscription_table_id || currentSub.id;
      const res = await queryDb(
        `UPDATE subscriptions
         SET cancel_at_period_end = NOT cancel_at_period_end, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [actualSubId]
      );
      const refreshed = await fetchFullSubscription(subId);
      return NextResponse.json({
        success: true,
        message: 'Auto-renewal setting updated.',
        subscription: refreshed || res.rows[0],
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 4: SETTLE PENDING INVOICE / PAYMENT
    // ------------------------------------------------------------------------
    if (action === 'settle_payment') {
      const paymentId = Number(body.payment_id);
      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });
      }

      const pRes = await queryDb('SELECT * FROM payments WHERE id = $1 LIMIT 1', [paymentId]);
      const payRecord = pRes.rows[0];
      if (!payRecord) {
        return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
      }

      await queryDb(
        `UPDATE payments
         SET status = 'successful', payment_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [paymentId]
      );

      let updatedPu = null;
      if (payRecord.purchase_id) {
        const puRes = await queryDb(
          `UPDATE purchases
           SET status = 'completed', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [payRecord.purchase_id]
        );
        updatedPu = puRes.rows[0];
      }

      const actualSubId = currentSub.subscription_table_id || currentSub.id;
      if (actualSubId) {
        await queryDb(
          `UPDATE subscriptions
           SET status = 'active',
               current_period_start = COALESCE($1, current_period_start),
               current_period_end = COALESCE($2, current_period_end),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [updatedPu?.period_start || null, updatedPu?.period_end || null, actualSubId]
        );
      }

      if (updatedPu?.period_end) {
        if (currentSub.website_id) {
          await queryDb(
            `UPDATE websites
             SET subscription_expires_at = $1, status = 'published', updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [updatedPu.period_end, currentSub.website_id]
          ).catch(() => {});
        }
      }

      const refreshed = await fetchFullSubscription(subId);
      return NextResponse.json({
        success: true,
        message: 'Payment settled as PAID and subscription activated successfully!',
        subscription: refreshed,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Subscription [id] POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT handler to update subscription record metadata directly
 */
export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const resolvedParams = await params;
    const subId = Number(resolvedParams?.id);
    if (!subId || isNaN(subId)) {
      return NextResponse.json({ success: false, error: 'Invalid subscription ID' }, { status: 400 });
    }

    const currentSub = await fetchFullSubscription(subId);
    if (!currentSub) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = body.data || body;
    const actualSubId = currentSub.subscription_table_id || currentSub.id;

    const allowedSubKeys = [
      'package_id', 'website_id', 'status', 'billing_cycle',
      'current_period_start', 'current_period_end', 'cancel_at_period_end'
    ];

    const keys = Object.keys(data).filter((k) => allowedSubKeys.includes(k));
    if (keys.length > 0) {
      const values = keys.map((k) => data[k]);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
      values.push(actualSubId);

      await queryDb(
        `UPDATE subscriptions SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
        values
      );
    }

    // Bidirectional sync for website_id
    if (data.website_id !== undefined) {
      const targetWebsiteId = data.website_id ? Number(data.website_id) : null;
      if (targetWebsiteId) {
        // Unlink other subscriptions claiming this website
        await queryDb(`UPDATE subscriptions SET website_id = NULL WHERE website_id = $1 AND id != $2`, [targetWebsiteId, actualSubId]).catch(() => {});
        // Unlink other websites claiming this subscription
        await queryDb(`UPDATE websites SET subscription_id = NULL WHERE subscription_id = $1 AND id != $2`, [actualSubId, targetWebsiteId]).catch(() => {});
        // Connect website to this subscription
        await queryDb(
          `UPDATE websites SET subscription_id = $1, subscription_expires_at = COALESCE($2, subscription_expires_at), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [actualSubId, data.current_period_end || currentSub.current_period_end, targetWebsiteId]
        ).catch(() => {});
      } else {
        // Detached website from this subscription
        await queryDb(`UPDATE websites SET subscription_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE subscription_id = $1`, [actualSubId]).catch(() => {});
      }
    } else if (data.current_period_end) {
      const targetWebsiteId = currentSub.website_id;
      if (targetWebsiteId) {
        await queryDb(
          `UPDATE websites SET subscription_expires_at = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [data.current_period_end, targetWebsiteId]
        ).catch(() => {});
      }
    }

    const refreshed = await fetchFullSubscription(subId);
    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: refreshed,
    });
  } catch (error) {
    console.error('Subscription [id] PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE handler to remove subscription and linked purchase/payments
 */
export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const resolvedParams = await params;
    const subId = Number(resolvedParams?.id);
    if (!subId || isNaN(subId)) {
      return NextResponse.json({ success: false, error: 'Invalid subscription ID' }, { status: 400 });
    }

    const currentSub = await fetchFullSubscription(subId);
    if (!currentSub) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }

    const purchaseId = currentSub.purchase_id;
    const actualSubId = currentSub.subscription_table_id || currentSub.id;

    if (actualSubId) {
      await queryDb('DELETE FROM subscriptions WHERE id = $1', [actualSubId]).catch(() => {});
    }
    if (purchaseId) {
      await queryDb('DELETE FROM payments WHERE purchase_id = $1', [purchaseId]).catch(() => {});
      await queryDb('DELETE FROM purchases WHERE id = $1', [purchaseId]).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Subscription removed successfully' });
  } catch (error) {
    console.error('Subscription [id] DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

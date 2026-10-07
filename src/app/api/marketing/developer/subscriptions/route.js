import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { generateToken } from 'src/lib/utils/random';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const res = await queryDb(`
      SELECT pu.*,
             pu.id,
             pu.creator_id,
             pu.package_id,
             pu.status AS purchase_status,
             pu.billing_cycle,
             pu.total_amount,
             pu.period_start AS current_period_start,
             pu.period_end AS current_period_end,
             c.name AS creator_name,
             c.email AS creator_email,
             c.institution AS creator_institution,
             p.name AS package_name,
             p.slug AS package_slug,
             p.is_public AS package_is_public,
             w.name AS website_name,
             pay.id AS payment_id,
             pay.status AS payment_status,
             pay.payment_method,
             pay.transaction_id,
             pay.currency AS payment_currency,
             pay.amount AS payment_amount,
             s.id AS subscription_id,
             COALESCE(s.status, CASE WHEN pu.status = 'completed' THEN 'active' ELSE 'past_due' END) AS subscription_status
      FROM purchases pu
      LEFT JOIN creators c ON pu.creator_id = c.id
      LEFT JOIN packages p ON pu.package_id = p.id
      LEFT JOIN websites w ON pu.website_id = w.id
      LEFT JOIN LATERAL (
        SELECT py.* FROM payments py WHERE py.purchase_id = pu.id ORDER BY py.id DESC LIMIT 1
      ) pay ON true
      LEFT JOIN LATERAL (
        SELECT sub.* FROM subscriptions sub WHERE sub.purchase_id = pu.id ORDER BY sub.id DESC LIMIT 1
      ) s ON true
      ORDER BY pu.id DESC
    `).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      table: 'purchases',
      records: res.rows,
      subscriptions: res.rows,
    });
  } catch (error) {
    console.error('Developer subscriptions GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE SUBSCRIPTION FOR CREATOR (PAID OR UNPAID)
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;

    // 1. Resolve & validate Creator
    const creatorEmail = (data.creator_email || data.email || '').trim().toLowerCase();
    const creatorIdInput = data.creator_id ? Number(data.creator_id) : null;

    let creator = null;
    if (creatorEmail) {
      const cRes = await queryDb(
        `SELECT id, name, email, institution, is_active FROM creators WHERE LOWER(email) = $1 LIMIT 1`,
        [creatorEmail]
      );
      creator = cRes.rows[0];
    } else if (creatorIdInput) {
      const cRes = await queryDb(
        `SELECT id, name, email, institution, is_active FROM creators WHERE id = $1 LIMIT 1`,
        [creatorIdInput]
      );
      creator = cRes.rows[0];
    }

    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found. Please provide a valid, registered creator email or ID.' },
        { status: 404 }
      );
    }

    if (creator.is_active === false) {
      return NextResponse.json(
        { success: false, error: `Creator account "${creator.email}" is disabled/inactive.` },
        { status: 400 }
      );
    }

    const creatorId = Number(creator.id);

    // 2. Resolve & validate Package
    const packageId = Number(data.package_id);
    if (!packageId || isNaN(packageId)) {
      return NextResponse.json({ success: false, error: 'Package ID is required.' }, { status: 400 });
    }

    const pkgRes = await queryDb('SELECT * FROM packages WHERE id = $1 LIMIT 1', [packageId]);
    const pkg = pkgRes.rows[0];
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Selected package does not exist.' }, { status: 404 });
    }

    // 3. Duration & Billing Cycle Calculation
    // duration_type: 'monthly', 'yearly', 'multiple_months', 'multiple_years', 'custom'
    const durationType = (data.duration_type || 'monthly').toLowerCase();
    const durationMultiplier = Math.max(1, parseInt(data.duration_multiplier, 10) || 1);

    const periodStart = data.period_start ? new Date(data.period_start) : new Date();
    let periodEnd = data.period_end ? new Date(data.period_end) : new Date(periodStart);

    let billingCycle = 'monthly';
    let monthsSpan = 1;

    if (durationType === 'yearly') {
      monthsSpan = 12;
      billingCycle = 'yearly';
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else if (durationType === 'multiple_years') {
      const years = durationMultiplier;
      monthsSpan = years * 12;
      billingCycle = 'yearly';
      periodEnd.setFullYear(periodEnd.getFullYear() + years);
    } else if (durationType === 'multiple_months') {
      monthsSpan = durationMultiplier;
      billingCycle = monthsSpan === 12 ? 'yearly' : 'custom';
      periodEnd.setMonth(periodEnd.getMonth() + monthsSpan);
    } else if (durationType === 'custom' && data.period_end) {
      periodEnd = new Date(data.period_end);
      billingCycle = 'custom';
    } else {
      // Default: 1 month
      monthsSpan = 1;
      billingCycle = 'monthly';
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 4. Amount and Currency Calculation
    const currency = (data.currency || 'USD').toUpperCase();
    let calculatedAmount = 0;

    if (data.amount !== undefined && data.amount !== '' && !isNaN(Number(data.amount))) {
      calculatedAmount = Math.max(0, Number(data.amount));
    } else {
      const isYearlyPlan = durationType === 'yearly' || durationType === 'multiple_years';
      const yearCount = durationType === 'multiple_years' ? durationMultiplier : 1;

      if (currency === 'BDT') {
        if (isYearlyPlan) {
          calculatedAmount = Number(pkg.yearly_price_bdt || 0) * yearCount;
        } else {
          calculatedAmount = Number(pkg.monthly_price_bdt || 0) * monthsSpan;
        }
      } else {
        if (isYearlyPlan) {
          calculatedAmount = Number(pkg.yearly_price_usd || pkg.yearly_price || 0) * yearCount;
        } else {
          calculatedAmount = Number(pkg.monthly_price_usd || pkg.monthly_price || 0) * monthsSpan;
        }
      }
    }

    // 5. Payment Status: PAID vs UNPAID
    // Strict uppercase token generation with NO prefixes/suffixes:
    const purchaseCode = generateToken(12);
    const transactionId = generateToken(14);

    const isPaid =
      String(data.payment_status || '').toUpperCase() === 'PAID' ||
      Boolean(data.is_paid) === true;

    const purchaseStatus = isPaid ? 'completed' : 'pending';
    const paymentStatus = isPaid ? 'successful' : 'pending';
    const subscriptionStatus = isPaid ? 'active' : 'past_due';

    const paymentMethod = isPaid
      ? (data.payment_method || 'DEVELOPER_GRANT')
      : 'INVOICE';

    const paymentGateway = isPaid
      ? 'DIRECT_GRANT'
      : 'PENDING_PAYMENT';

    const notes = (data.notes || (isPaid ? 'Developer grant - Paid' : 'Developer custom subscription - Awaiting payment')).trim();

    // 6. Insert Purchase Record
    const puRes = await queryDb(
      `INSERT INTO purchases (
        creator_id, package_id, purchase_code, billing_cycle,
        base_amount, discount_amount, tax_amount, total_amount,
        status, period_start, period_end, notes
      ) VALUES (
        $1, $2, $3, $4,
        $5, 0.00, 0.00, $5,
        $6, $7, $8, $9
      )
      RETURNING *`,
      [
        creatorId, packageId, purchaseCode, billingCycle,
        calculatedAmount, purchaseStatus, periodStart, periodEnd, notes
      ]
    );
    const purchase = puRes.rows[0];

    // 7. Insert Payment Record
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
        purchase.id, creatorId, transactionId, calculatedAmount, currency,
        paymentMethod, paymentGateway, paymentStatus, isPaid ? new Date() : null
      ]
    );
    const payment = payRes.rows[0];

    // 8. Insert or Update Subscriptions Record
    const websiteIdInput = data.website_id ? Number(data.website_id) : null;
    let subscription = null;
    try {
      const subRes = await queryDb(
        `INSERT INTO subscriptions (
          creator_id, package_id, website_id, purchase_id, status, billing_cycle,
          current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, FALSE
        )
        RETURNING *`,
        [creatorId, packageId, websiteIdInput, purchase.id, subscriptionStatus, billingCycle, periodStart, periodEnd]
      );
      subscription = subRes.rows[0];
    } catch (subErr) {
      console.warn('Notice inserting subscription record:', subErr.message);
    }

    // 9. Update website subscription expiration and link if website exists
    if (subscription?.id) {
      if (websiteIdInput) {
        await queryDb(
          `UPDATE websites
           SET subscription_id = $1, subscription_expires_at = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [subscription.id, periodEnd, websiteIdInput]
        ).catch(() => {});
      } else if (isPaid) {
        await queryDb(
          `UPDATE websites
           SET subscription_expires_at = $1, subscription_id = COALESCE(subscription_id, $2), updated_at = CURRENT_TIMESTAMP
           WHERE creator_id = $3`,
          [periodEnd, subscription.id, creatorId]
        ).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: isPaid
        ? `Paid subscription for "${pkg.name}" granted and activated for creator "${creator.name}".`
        : `Unpaid subscription invoice for "${pkg.name}" issued. It is now awaiting payment in creator panel.`,
      purchase,
      payment,
      subscription: subscription || purchase,
      record: purchase,
    }, { status: 201 });
  } catch (error) {
    console.error('Developer subscriptions POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE SUBSCRIPTION
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }
    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const rawData = body.data || body;
    const data = { ...rawData };

    if (data.current_period_end && !data.period_end) {
      data.period_end = data.current_period_end;
      delete data.current_period_end;
    }
    if (data.current_period_start && !data.period_start) {
      data.period_start = data.current_period_start;
      delete data.current_period_start;
    }

    if (data.status) {
      const s = String(data.status).toLowerCase();
      data.status = (s === 'active' || s === 'completed') ? 'completed' : (s === 'cancelled' ? 'cancelled' : 'pending');
    }

    const allowedKeys = [
      'package_id', 'billing_cycle', 'base_amount', 'discount_amount',
      'tax_amount', 'total_amount', 'status', 'period_start', 'period_end',
      'invoice_pdf_url', 'notes'
    ];

    const keys = Object.keys(data).filter((k) => allowedKeys.includes(k));
    if (keys.length === 0) return NextResponse.json({ success: true });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);

    const res = await queryDb(
      `UPDATE purchases SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );

    const updatedPurchase = res.rows[0];

    // If purchase status updated, sync subscriptions table status
    if (updatedPurchase) {
      const newSubStatus = updatedPurchase.status === 'completed' ? 'active' : (updatedPurchase.status === 'cancelled' ? 'cancelled' : 'past_due');
      await queryDb(
        `UPDATE subscriptions
         SET status = $1, current_period_start = $2, current_period_end = $3, updated_at = CURRENT_TIMESTAMP
         WHERE purchase_id = $4`,
        [newSubStatus, updatedPurchase.period_start, updatedPurchase.period_end, updatedPurchase.id]
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, record: updatedPurchase, subscription: updatedPurchase });
  } catch (error) {
    console.error('Developer subscriptions PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE SUBSCRIPTION
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, ['subscriptions', 'creators']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    // Cascades or deletes linked payments and subscriptions
    await queryDb('DELETE FROM payments WHERE purchase_id = $1', [id]).catch(() => {});
    await queryDb('DELETE FROM subscriptions WHERE purchase_id = $1', [id]).catch(() => {});
    await queryDb('DELETE FROM purchases WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Subscription and associated invoice removed.' });
  } catch (error) {
    console.error('Developer subscriptions DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

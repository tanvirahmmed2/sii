import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'creators');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied' },
        { status: auth.status || 403 }
      );
    }

    const resolvedParams = await params;
    const creatorId = parseInt(resolvedParams?.id, 10);
    if (!creatorId || isNaN(creatorId)) {
      return NextResponse.json({ success: false, error: 'Invalid Creator ID' }, { status: 400 });
    }

    // 1. Fetch creator profile
    const creatorRes = await queryDb(
      `SELECT id, name, email, phone, institution, country, city, address,
              institution AS bio, is_active, email_verified AS is_verified,
              (CASE WHEN two_factor_code IS NOT NULL THEN true ELSE false END) AS two_factor_enabled,
              last_login_at, created_at, updated_at
       FROM creators 
       WHERE id = $1 LIMIT 1`,
      [creatorId]
    );

    const creator = creatorRes.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    // 2. Parallel queries for subscriptions (purchases), websites, payments, support tickets
    const [subsRes, websitesRes, paymentsRes, ticketsRes] = await Promise.all([
      queryDb(
        `SELECT pu.id, pu.creator_id, pu.website_id, pu.package_id, pu.purchase_code,
                pu.billing_cycle, pu.billing_cycle AS billing_interval,
                (pu.total_amount * 100)::bigint AS price_in_cents,
                'USD' AS currency,
                pu.status,
                pu.period_start AS current_period_start,
                pu.period_end AS current_period_end,
                pu.created_at, pu.updated_at,
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.description AS package_description, 
                p.monthly_price_usd,
                COALESCE(p.max_websites, 1) AS max_websites,
                COALESCE(p.max_websites, 1) AS max_portfolios
         FROM purchases pu
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pu.creator_id = $1
         ORDER BY pu.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, creator_id, name, slug, subdomain, custom_domain, theme, primary_color, secondary_color,
                status, storage_used_mb,
                (CASE WHEN status = 'active' AND NOT is_maintenance_mode THEN true ELSE false END) AS is_published,
                created_at, updated_at
         FROM websites
         WHERE creator_id = $1
         ORDER BY id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT pay.id, pay.purchase_id, pay.creator_id, pay.transaction_id,
                pay.amount, (pay.amount * 100)::bigint AS amount_in_cents,
                pay.currency, pay.payment_method, pay.payment_gateway,
                pay.status, pay.payment_date, pay.created_at, pay.updated_at,
                p.name AS package_name
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.creator_id = $1
         ORDER BY pay.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT s.id, s.creator_id, s.ticket_number, s.subject, s.status, s.priority,
                s.created_at, s.updated_at,
                c.name AS requester_name, c.email AS requester_email,
                'General' AS category,
                (SELECT sm.message FROM support_messages sm WHERE sm.support_id = s.id ORDER BY sm.id ASC LIMIT 1) AS message
         FROM supports s
         LEFT JOIN creators c ON s.creator_id = c.id
         WHERE s.creator_id = $1
         ORDER BY s.id DESC LIMIT 25`,
        [creatorId]
      ).catch(() => ({ rows: [] })),
    ]);

    const subscriptions = subsRes.rows;
    const websites = websitesRes.rows;
    const payments = paymentsRes.rows;
    const tickets = ticketsRes.rows;

    const activeSubscription = subscriptions.find((s) => s.status === 'completed' || s.status === 'active' || s.status === 'ACTIVE') || subscriptions[0] || null;

    let daysRemaining = 0;
    if (activeSubscription?.current_period_end) {
      const now = new Date();
      const end = new Date(activeSubscription.current_period_end);
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

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
    const totalStorageMb = websites.reduce((acc, w) => acc + Number(w.storage_used_mb || 0), 0);

    return NextResponse.json({
      success: true,
      creator,
      activeSubscription,
      subscriptions,
      websites,
      payments,
      tickets,
      stats: {
        totalWebsites: websites.length,
        maxWebsites: activeSubscription?.max_websites ?? activeSubscription?.max_portfolios ?? 0,
        totalStorageMb,
        totalSpentUsd,
        totalSpentBdt,
        daysRemaining,
        totalPayments: payments.length,
        totalTickets: tickets.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'creators');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied' },
        { status: auth.status || 403 }
      );
    }

    const resolvedParams = await params;
    const creatorId = parseInt(resolvedParams?.id, 10);
    if (!creatorId || isNaN(creatorId)) {
      return NextResponse.json({ success: false, error: 'Invalid Creator ID' }, { status: 400 });
    }

    const body = await request.json();

    if (body.toggle_active !== undefined) {
      const res = await queryDb(
        'UPDATE creators SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, email, is_active',
        [creatorId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, creator: res.rows[0] });
    }

    const rawData = body.data || body;
    const data = { ...rawData };
    if (data.is_verified !== undefined && data.email_verified === undefined) {
      data.email_verified = data.is_verified;
      delete data.is_verified;
    }
    if (data.bio !== undefined && data.institution === undefined) {
      data.institution = data.bio;
      delete data.bio;
    }

    const allowedKeys = ['name', 'phone', 'institution', 'country', 'city', 'address', 'is_active', 'email_verified'];
    const keys = Object.keys(data).filter((k) => allowedKeys.includes(k));
    if (keys.length === 0) {
      return NextResponse.json({ success: true, message: 'No valid fields provided to update' });
    }

    const values = keys.map((k) => data[k]);
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(creatorId);

    const res = await queryDb(
      `UPDATE creators SET ${setClauses.join(', ')} WHERE id = $${values.length} 
       RETURNING id, name, email, phone, institution, country, city, address,
                 institution AS bio, is_active, email_verified AS is_verified,
                 (CASE WHEN two_factor_code IS NOT NULL THEN true ELSE false END) AS two_factor_enabled,
                 updated_at`,
      values
    );

    return NextResponse.json({ success: true, creator: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

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
      `SELECT id, name, email, phone, bio, is_active, is_verified, 
              two_factor_enabled, last_login_at, last_login_ip, created_at, updated_at
       FROM creators 
       WHERE id = $1 LIMIT 1`,
      [creatorId]
    );

    const creator = creatorRes.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    // 2. Parallel queries for subscriptions, websites, payments, support tickets
    const [subsRes, websitesRes, paymentsRes, ticketsRes] = await Promise.all([
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
         WHERE s.creator_id = $1
         ORDER BY s.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, creator_id, name, subdomain, custom_domain, theme_config, 
                status, storage_used_mb, is_published, created_at, updated_at
         FROM websites
         WHERE creator_id = $1
         ORDER BY id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT pay.*, p.name AS package_name
         FROM payment pay
         LEFT JOIN packages p ON pay.package_id = p.id
         WHERE pay.creator_id = $1
         ORDER BY pay.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, requester_name, requester_email, subject, message, status, priority, category, created_at, updated_at
         FROM support
         WHERE LOWER(requester_email) = LOWER($1)
         ORDER BY id DESC LIMIT 25`,
        [creator.email]
      ).catch(() => ({ rows: [] })),
    ]);

    const subscriptions = subsRes.rows;
    const websites = websitesRes.rows;
    const payments = paymentsRes.rows;
    const tickets = ticketsRes.rows;

    const activeSubscription = subscriptions.find((s) => s.status === 'ACTIVE') || subscriptions[0] || null;

    let daysRemaining = 0;
    if (activeSubscription?.current_period_end) {
      const now = new Date();
      const end = new Date(activeSubscription.current_period_end);
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const totalSpentCents = payments.reduce(
      (acc, p) => acc + (p.status === 'COMPLETED' ? Number(p.amount_in_cents || 0) : 0),
      0
    );
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
        totalSpentCents,
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

    const data = body.data || body;
    const allowedKeys = ['name', 'phone', 'bio', 'is_active', 'is_verified', 'two_factor_enabled'];
    const keys = Object.keys(data).filter((k) => allowedKeys.includes(k));
    if (keys.length === 0) {
      return NextResponse.json({ success: true, message: 'No valid fields provided to update' });
    }

    const values = keys.map((k) => data[k]);
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(creatorId);

    const res = await queryDb(
      `UPDATE creators SET ${setClauses.join(', ')} WHERE id = $${values.length} 
       RETURNING id, name, email, phone, bio, is_active, is_verified, two_factor_enabled, updated_at`,
      values
    );

    return NextResponse.json({ success: true, creator: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

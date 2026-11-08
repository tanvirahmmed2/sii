import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission, hashPassword } from 'src/lib/middleware/developer';
import { inspectMalwareAndAttacks } from 'src/lib/security/shield';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'creators', 'view');
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

    const creatorRes = await queryDb(
      `SELECT id, name, email, phone, country, city, address,
              is_active, email_verified AS is_verified,
              COALESCE(two_factor_enabled, false) AS two_factor_enabled,
              last_login_at, created_at, updated_at
       FROM creators 
       WHERE id = $1 LIMIT 1`,
      [creatorId]
    );

    const creator = creatorRes.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    const [purchasesRes, subsRes, websitesRes, paymentsRes, ticketsRes] = await Promise.all([
      queryDb(
        `SELECT pu.id, pu.creator_id, pu.website_id, pu.package_id, pu.purchase_code,
                pu.billing_cycle, pu.base_amount, pu.discount_amount, pu.tax_amount, pu.total_amount,
                (pu.total_amount * 100)::bigint AS price_in_cents,
                'USD' AS currency,
                pu.status, pu.period_start, pu.period_end, pu.invoice_pdf_url, pu.notes,
                pu.created_at, pu.updated_at,
                p.name AS package_name, p.slug AS package_slug,
                w.name AS website_name
         FROM purchases pu
         LEFT JOIN packages p ON pu.package_id = p.id
         LEFT JOIN websites w ON pu.website_id = w.id
         WHERE pu.creator_id = $1
         ORDER BY pu.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT s.id, s.creator_id, s.website_id, s.package_id, s.purchase_id,
                s.status, s.billing_cycle, s.billing_cycle AS billing_interval,
                s.current_period_start, s.current_period_end, s.cancel_at_period_end,
                s.created_at, s.updated_at,
                p.name AS package_name, p.slug AS package_slug,
                COALESCE(p.monthly_price_usd, p.monthly_price, 0) AS price,
                (COALESCE(p.monthly_price_usd, p.monthly_price, 0) * 100)::bigint AS price_in_cents,
                'USD' AS currency,
                w.name AS website_name,
                pu.purchase_code
         FROM subscriptions s
         LEFT JOIN packages p ON s.package_id = p.id
         LEFT JOIN websites w ON s.website_id = w.id
         LEFT JOIN purchases pu ON s.purchase_id = pu.id
         WHERE s.creator_id = $1
         ORDER BY s.id DESC`,
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
        `SELECT pay.id, pay.purchase_id, pay.creator_id, pay.website_id,
                pay.transaction_id, pay.amount, (pay.amount * 100)::bigint AS amount_in_cents,
                pay.currency, pay.payment_method, pay.payment_gateway,
                pay.status, pay.payment_date, pay.created_at, pay.updated_at,
                pu.purchase_code, p.name AS package_name
         FROM payments pay
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.creator_id = $1
         ORDER BY pay.id DESC`,
        [creatorId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT s.id, s.creator_id, s.website_id, s.assigned_developer_id,
                s.ticket_number, s.subject, s.status, s.priority, s.last_message_at,
                s.created_at, s.updated_at,
                d.name AS assigned_developer_name,
                w.name AS website_name,
                (SELECT sm.message FROM support_messages sm WHERE sm.support_id = s.id ORDER BY sm.id ASC LIMIT 1) AS initial_message,
                (SELECT COUNT(*)::int FROM support_messages sm WHERE sm.support_id = s.id) AS messages_count
         FROM supports s
         LEFT JOIN developers d ON s.assigned_developer_id = d.id
         LEFT JOIN websites w ON s.website_id = w.id
         WHERE s.creator_id = $1
         ORDER BY s.id DESC LIMIT 50`,
        [creatorId]
      ).catch(() => ({ rows: [] })),
    ]);

    const purchases = purchasesRes.rows;
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
      purchases,
      supports: tickets,
      tickets,
      websites,
      payments,
      canEdit: Boolean(auth.canEdit),
      stats: {
        totalWebsites: websites.length,
        maxWebsites: activeSubscription?.max_websites ?? activeSubscription?.max_portfolios ?? 0,
        totalStorageMb,
        totalSpentUsd,
        totalSpentBdt,
        daysRemaining,
        totalPurchases: purchases.length,
        totalSubscriptions: subscriptions.length,
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
    const auth = await hasModulePermission(request, 'creators', 'edit');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied: You do not have permission to modify creators' },
        { status: auth.status || 403 }
      );
    }

    const resolvedParams = await params;
    const creatorId = parseInt(resolvedParams?.id, 10);
    if (!creatorId || isNaN(creatorId)) {
      return NextResponse.json({ success: false, error: 'Invalid Creator ID' }, { status: 400 });
    }

    const body = await request.json();
    const sec = await inspectMalwareAndAttacks(request, body);
    if (sec.isBlocked || sec.allowed === false) {
      return NextResponse.json(
        { success: false, error: sec.error || 'Request blocked by security rules.' },
        { status: sec.status || 403 }
      );
    }

    if (body.action === 'change_password' || body.newPassword) {
      const newPassword = String(body.newPassword || '').trim();
      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(newPassword);
      const updateRes = await queryDb(
        'UPDATE creators SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email',
        [hashedPassword, creatorId]
      );

      if (updateRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Creator password has been updated successfully.' });
    }

    if (body.toggle_active !== undefined) {
      const res = await queryDb(
        'UPDATE creators SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, email, phone, country, city, address, is_active, email_verified AS is_verified, COALESCE(two_factor_enabled, false) AS two_factor_enabled, updated_at',
        [creatorId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, creator: res.rows[0], message: `Creator account ${res.rows[0].is_active ? 'activated' : 'suspended'} successfully.` });
    }

    const currentRes = await queryDb('SELECT id, name, email, phone, country, city, address FROM creators WHERE id = $1 LIMIT 1', [creatorId]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }
    const current = currentRes.rows[0];

    const rawData = body.data || body;
    const newName = rawData.name !== undefined ? rawData.name.trim() : current.name;
    let newEmail = current.email;
    if (rawData.email !== undefined) {
      newEmail = rawData.email.trim().toLowerCase();
      if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
      }
      if (newEmail !== current.email.toLowerCase()) {
        const emailCheck = await queryDb('SELECT id FROM creators WHERE LOWER(email) = LOWER($1) AND id != $2 LIMIT 1', [newEmail, creatorId]);
        if (emailCheck.rows.length > 0) {
          return NextResponse.json({ success: false, error: 'This email address is already registered to another creator.' }, { status: 409 });
        }
      }
    }

    let newPhone = current.phone;
    if (rawData.phone !== undefined) {
      newPhone = rawData.phone.trim();
      if (!newPhone) {
        return NextResponse.json({ success: false, error: 'Phone number cannot be empty.' }, { status: 400 });
      }
      if (newPhone !== current.phone) {
        const phoneCheck = await queryDb('SELECT id FROM creators WHERE phone = $1 AND id != $2 LIMIT 1', [newPhone, creatorId]);
        if (phoneCheck.rows.length > 0) {
          return NextResponse.json({ success: false, error: 'This phone number is already registered to another creator.' }, { status: 409 });
        }
      }
    }

    const newCountry = rawData.country !== undefined ? rawData.country.trim() : current.country;
    const newCity = rawData.city !== undefined ? rawData.city.trim() : current.city;
    const newAddress = rawData.address !== undefined ? rawData.address.trim() : current.address;
    const newIsActive = rawData.is_active !== undefined ? Boolean(rawData.is_active) : undefined;
    const newEmailVerified = rawData.email_verified !== undefined ? Boolean(rawData.email_verified) : (rawData.is_verified !== undefined ? Boolean(rawData.is_verified) : undefined);

    const updateRes = await queryDb(
      `UPDATE creators
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           country = COALESCE($4, country),
           city = COALESCE($5, city),
           address = COALESCE($6, address),
           is_active = COALESCE($7, is_active),
           email_verified = COALESCE($8, email_verified),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, name, email, phone, country, city, address, is_active, email_verified AS is_verified, COALESCE(two_factor_enabled, false) AS two_factor_enabled, updated_at`,
      [newName, newEmail, newPhone, newCountry || null, newCity || null, newAddress || null, newIsActive, newEmailVerified, creatorId]
    );

    return NextResponse.json({ success: true, creator: updateRes.rows[0], message: 'Creator details updated successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
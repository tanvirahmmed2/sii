import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

import slugify from 'slugify';

async function generateUniqueSlug(name, excludeId = null) {
  const baseSlug = slugify(name || 'package', { lower: true, strict: true, trim: true }) || 'package';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const params = excludeId ? [slug, Number(excludeId)] : [slug];
    const query = excludeId
      ? 'SELECT id FROM packages WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM packages WHERE slug = $1 LIMIT 1';
    const check = await queryDb(query, params);
    if (check.rows.length === 0) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const res = await queryDb(
      `SELECT p.*, a.title AS app_title, a.slug AS app_slug,
              COALESCE(
                (
                  SELECT json_agg(am.module_title ORDER BY am.id ASC)
                  FROM allowed_modules am
                  WHERE am.package_id = p.id
                ),
                '[]'::json
              ) AS allowed_modules
       FROM packages p
       LEFT JOIN apps a ON p.app_id = a.id
       WHERE p.slug = $1 OR p.id::text = $1
       LIMIT 1`,
      [cleanSlug]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    const record = res.rows[0];

    // Count subscribers / active subscriptions
    let subscriptionsCount = 0;
    try {
      const subRes = await queryDb(
        `SELECT COUNT(*)::int AS count FROM subscription WHERE package_id = $1`,
        [record.id]
      );
      subscriptionsCount = subRes.rows[0]?.count || 0;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      record,
      package: record,
      subscriptions_count: subscriptionsCount,
    });
  } catch (error) {
    console.error('Developer package GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb('SELECT * FROM packages WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    const body = await request.json();
    const data = body.data || body;

    const name = data.name !== undefined ? (data.name || '').trim() : current.name;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Package name cannot be empty' }, { status: 400 });
    }

    const appId = data.app_id !== undefined ? (data.app_id ? Number(data.app_id) : null) : current.app_id;
    if (!appId) {
      return NextResponse.json({ success: false, error: 'A linked application (app_id) is required.' }, { status: 400 });
    }

    let newSlug = current.slug;
    if (name && name !== current.name) {
      newSlug = await generateUniqueSlug(name, current.id);
    }

    const description = data.description !== undefined ? data.description : current.description;
    const monthlyPriceUsd = data.monthly_price_usd !== undefined
      ? Math.max(0, Number(data.monthly_price_usd) || 0)
      : Number(current.monthly_price_usd !== undefined ? current.monthly_price_usd : 0);
    const yearlyPriceUsd = data.yearly_price_usd !== undefined
      ? Math.max(0, Number(data.yearly_price_usd) || 0)
      : Number(current.yearly_price_usd !== undefined ? current.yearly_price_usd : 0);
    const monthlyPriceBdt = data.monthly_price_bdt !== undefined
      ? Math.max(0, Number(data.monthly_price_bdt) || 0)
      : Number(current.monthly_price_bdt !== undefined ? current.monthly_price_bdt : 0);
    const yearlyPriceBdt = data.yearly_price_bdt !== undefined
      ? Math.max(0, Number(data.yearly_price_bdt) || 0)
      : Number(current.yearly_price_bdt !== undefined ? current.yearly_price_bdt : 0);
    const priceInCents = Math.round(monthlyPriceUsd * 100);
    const currency = data.currency !== undefined ? (data.currency || 'USD').toUpperCase() : current.currency;
    const billingInterval = (data.billing_interval || data.billingInterval) !== undefined
      ? (data.billing_interval || data.billingInterval || 'MONTHLY').toUpperCase()
      : current.billing_interval;
    const maxWebsites = data.max_websites !== undefined
      ? Math.max(1, Number(data.max_websites))
      : (data.max_portfolios !== undefined
          ? Math.max(1, Number(data.max_portfolios))
          : (current.max_websites !== undefined ? current.max_websites : (current.max_portfolios || 1)));
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

    const res = await queryDb(
      `UPDATE packages
       SET name = $1,
           slug = $2,
           description = $3,
           price_in_cents = $4,
           currency = $5,
           billing_interval = $6,
           monthly_price_usd = $7,
           yearly_price_usd = $8,
           monthly_price_bdt = $9,
           yearly_price_bdt = $10,
           max_websites = $11,
           max_portfolios = $12,
           is_active = $13,
           app_id = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [
        name, newSlug, description, priceInCents, currency, billingInterval,
        monthlyPriceUsd, yearlyPriceUsd, monthlyPriceBdt, yearlyPriceBdt,
        maxWebsites, maxWebsites, isActive, appId, current.id
      ]
    );

    const updatedPackage = res.rows[0];

    // Synchronize allowed_modules if provided
    const modulesToSave = Array.isArray(data.allowed_modules)
      ? data.allowed_modules
      : (Array.isArray(data.modules) ? data.modules : null);

    if (modulesToSave !== null) {
      await queryDb('DELETE FROM allowed_modules WHERE package_id = $1', [current.id]);
      for (const modItem of modulesToSave) {
        const cleanTitle = String(
          typeof modItem === 'object' && modItem !== null
            ? (modItem.name || modItem.title || modItem.slug || '')
            : (modItem || '')
        ).trim();
        if (cleanTitle) {
          await queryDb(
            `INSERT INTO allowed_modules (package_id, module_title) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [current.id, cleanTitle]
          ).catch((e) => console.warn('Error syncing allowed_module:', e.message));
        }
      }
    }

    const modRes = await queryDb(
      `SELECT module_title FROM allowed_modules WHERE package_id = $1 ORDER BY id ASC`,
      [current.id]
    ).catch(() => ({ rows: [] }));

    updatedPackage.allowed_modules = modRes.rows.map((r) => r.module_title);

    return NextResponse.json({
      success: true,
      record: updatedPackage,
      package: updatedPackage,
      message: 'Package updated successfully',
    });
  } catch (error) {
    console.error('Developer package PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const deleteRes = await queryDb(
      'DELETE FROM packages WHERE slug = $1 OR id::text = $1 RETURNING id, name',
      [cleanSlug]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Package "${deleteRes.rows[0].name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Developer package DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

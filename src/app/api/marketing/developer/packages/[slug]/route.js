import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
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

// Fetch package helper with full tenant_modules
async function fetchFullPackageBySlugOrId(slugOrId) {
  const res = await queryDb(
    `SELECT p.*,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', tm.id,
                    'name', tm.name,
                    'slug', tm.slug,
                    'description', tm.description,
                    'icon', tm.icon,
                    'is_active', tm.is_active
                  ) ORDER BY tm.id ASC
                )
                FROM package_modules pm
                JOIN tenant_modules tm ON pm.tenant_module_id = tm.id
                WHERE pm.package_id = p.id
              ),
              '[]'::json
            ) AS tenant_modules,
            COALESCE(
              (
                SELECT json_agg(pm.tenant_module_id ORDER BY pm.tenant_module_id ASC)
                FROM package_modules pm
                WHERE pm.package_id = p.id
              ),
              '[]'::json
            ) AS tenant_module_ids,
            COALESCE(
               (
                 SELECT json_agg(DISTINCT tm.name ORDER BY tm.name ASC)
                 FROM package_modules pm
                 JOIN tenant_modules tm ON pm.tenant_module_id = tm.id
                 WHERE pm.package_id = p.id
               ),
               '[]'::json
             ) AS allowed_modules
     FROM packages p
     WHERE p.slug = $1 OR p.id::text = $1
     LIMIT 1`,
    [slugOrId]
  );

  return res.rows[0] || null;
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const record = await fetchFullPackageBySlugOrId(cleanSlug);

    if (!record) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }

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

    let newSlug = current.slug;
    if (name && name !== current.name) {
      newSlug = await generateUniqueSlug(name, current.id);
    }

    const tagline = data.tagline !== undefined ? (data.tagline || '').trim() : (current.tagline || '');
    const description = data.description !== undefined ? data.description : current.description;

    const monthlyPriceUsd = data.monthly_price_usd !== undefined
      ? Math.max(0, Number(data.monthly_price_usd) || 0)
      : Number(current.monthly_price_usd ?? current.monthly_price ?? 0);

    const yearlyPriceUsd = data.yearly_price_usd !== undefined
      ? Math.max(0, Number(data.yearly_price_usd) || 0)
      : Number(current.yearly_price_usd ?? current.yearly_price ?? 0);

    const monthlyPriceBdt = data.monthly_price_bdt !== undefined
      ? Math.max(0, Number(data.monthly_price_bdt) || 0)
      : Number(current.monthly_price_bdt ?? 0);

    const yearlyPriceBdt = data.yearly_price_bdt !== undefined
      ? Math.max(0, Number(data.yearly_price_bdt) || 0)
      : Number(current.yearly_price_bdt ?? 0);

    const discountPercentage = data.discount_percentage !== undefined
      ? Math.min(100, Math.max(0, Number(data.discount_percentage) || 0))
      : Number(current.discount_percentage || 0);

    const maxStudents = data.max_students !== undefined
      ? Math.max(1, Number(data.max_students))
      : (current.max_students || 500);

    const maxTeachers = data.max_teachers !== undefined
      ? Math.max(1, Number(data.max_teachers))
      : (current.max_teachers || 30);

    const maxStaff = data.max_staff !== undefined
      ? Math.max(1, Number(data.max_staff))
      : (current.max_staff || 20);

    const maxStorageMb = data.max_storage_mb !== undefined
      ? Math.max(100, Number(data.max_storage_mb))
      : (current.max_storage_mb || 5120);

    const maxWebsites = data.max_websites !== undefined
      ? Math.max(1, Number(data.max_websites))
      : (data.max_portfolios !== undefined
          ? Math.max(1, Number(data.max_portfolios))
          : (current.max_websites ?? current.max_portfolios ?? 1));

    const isPopular = data.is_popular !== undefined ? Boolean(data.is_popular) : Boolean(current.is_popular);
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : Boolean(current.is_active);
    const trialDays = data.trial_days !== undefined ? Math.max(0, Number(data.trial_days)) : (current.trial_days || 14);
    const sortOrder = data.sort_order !== undefined ? Number(data.sort_order) || 0 : (current.sort_order || 0);

    let featuresJson = current.features ? JSON.stringify(current.features) : '[]';
    if (data.features !== undefined) {
      featuresJson = Array.isArray(data.features)
        ? JSON.stringify(data.features)
        : (typeof data.features === 'object' && data.features !== null ? JSON.stringify(data.features) : '[]');
    }

    await queryDb(
      `UPDATE packages
       SET name = $1,
           slug = $2,
           tagline = $3,
           description = $4,
           monthly_price_usd = $5,
           yearly_price_usd = $6,
           monthly_price_bdt = $7,
           yearly_price_bdt = $8,
           monthly_price = $9,
           yearly_price = $10,
           discount_percentage = $11,
           max_students = $12,
           max_teachers = $13,
           max_staff = $14,
           max_storage_mb = $15,
           max_websites = $16,
           features = $17::jsonb,
           is_popular = $18,
           is_active = $19,
           trial_days = $20,
           sort_order = $21,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $22`,
      [
        name, newSlug, tagline, description,
        monthlyPriceUsd, yearlyPriceUsd, monthlyPriceBdt, yearlyPriceBdt,
        monthlyPriceUsd, yearlyPriceUsd, discountPercentage,
        maxStudents, maxTeachers, maxStaff, maxStorageMb, maxWebsites,
        featuresJson, isPopular, isActive, trialDays, sortOrder,
        current.id
      ]
    );

    // Synchronize package_modules
    let tenantModuleIds = null;
    if (Array.isArray(data.tenant_module_ids)) {
      tenantModuleIds = data.tenant_module_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
    } else if (Array.isArray(data.tenant_modules)) {
      tenantModuleIds = data.tenant_modules
        .map((m) => (typeof m === 'object' && m !== null ? Number(m.id) : Number(m)))
        .filter((n) => !isNaN(n) && n > 0);
    } else if (Array.isArray(data.allowed_modules) || Array.isArray(data.modules)) {
      const rawNames = (data.allowed_modules || data.modules || []).map((x) =>
        String(typeof x === 'object' && x !== null ? x.name || x.slug : x).trim().toLowerCase()
      );
      if (rawNames.length > 0) {
        const resolved = await queryDb(
          `SELECT id FROM tenant_modules WHERE LOWER(name) = ANY($1) OR LOWER(slug) = ANY($1)`,
          [rawNames]
        ).catch(() => ({ rows: [] }));
        tenantModuleIds = resolved.rows.map((r) => r.id);
      } else {
        tenantModuleIds = [];
      }
    }

    if (tenantModuleIds !== null) {
      await queryDb('DELETE FROM package_modules WHERE package_id = $1', [current.id]).catch(() => {});
      await queryDb('DELETE FROM allowed_modules WHERE package_id = $1', [current.id]).catch(() => {});

      for (const modId of tenantModuleIds) {
        await queryDb(
          `INSERT INTO package_modules (package_id, tenant_module_id)
           VALUES ($1, $2)
           ON CONFLICT (package_id, tenant_module_id) DO NOTHING`,
          [current.id, modId]
        ).catch((e) => console.warn('Error syncing package_module:', e.message));
      }

      if (tenantModuleIds.length > 0) {
        const linkedMods = await queryDb(
          `SELECT name FROM tenant_modules WHERE id = ANY($1)`,
          [tenantModuleIds]
        ).catch(() => ({ rows: [] }));

        for (const row of linkedMods.rows) {
          await queryDb(
            // Legacy allowed_modules skipped
            [current.id, row.name]
          ).catch(() => {});
        }
      }
    }

    const updatedPackage = await fetchFullPackageBySlugOrId(newSlug);

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

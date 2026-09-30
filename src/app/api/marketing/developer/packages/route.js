import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

// Ensure tables and required columns exist
async function ensureTablesAndColumns() {
  await queryDb(`
    CREATE TABLE IF NOT EXISTS packages (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      tagline VARCHAR(255),
      description TEXT,
      monthly_price_usd DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      yearly_price_usd DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      monthly_price_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      yearly_price_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      monthly_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      yearly_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
      max_students INT DEFAULT 500,
      max_teachers INT DEFAULT 30,
      max_staff INT DEFAULT 20,
      max_storage_mb INT DEFAULT 5120,
      max_websites INT DEFAULT 1,
      features JSONB DEFAULT '[]'::jsonb,
      is_popular BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      trial_days INT DEFAULT 14,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE packages ADD COLUMN IF NOT EXISTS monthly_price_usd DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS yearly_price_usd DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS monthly_price_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS yearly_price_bdt DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_students INT DEFAULT 500;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_teachers INT DEFAULT 30;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_staff INT DEFAULT 20;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_storage_mb INT DEFAULT 5120;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_websites INT DEFAULT 1;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 14;
    ALTER TABLE packages ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

    CREATE TABLE IF NOT EXISTS tenant_modules (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package_modules (
      id BIGSERIAL PRIMARY KEY,
      package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      tenant_module_id BIGINT NOT NULL REFERENCES tenant_modules(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(package_id, tenant_module_id)
    );

    CREATE TABLE IF NOT EXISTS allowed_modules (
      id BIGSERIAL PRIMARY KEY,
      package_id BIGINT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      module_title VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((err) => console.warn('ensureTablesAndColumns warning:', err.message));
}

// Generate unique slug for packages
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

// Helper to query package with full tenant_modules and legacy allowed_modules
async function fetchPackageById(id) {
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
                SELECT json_agg(DISTINCT mod_title ORDER BY mod_title ASC)
                FROM (
                  SELECT am.module_title AS mod_title
                  FROM allowed_modules am
                  WHERE am.package_id = p.id
                  UNION
                  SELECT tm.name AS mod_title
                  FROM package_modules pm
                  JOIN tenant_modules tm ON pm.tenant_module_id = tm.id
                  WHERE pm.package_id = p.id
                ) combined_mods
              ),
              '[]'::json
            ) AS allowed_modules
     FROM packages p
     WHERE p.id = $1
     LIMIT 1`,
    [Number(id)]
  );

  return res.rows[0] || null;
}

export async function GET(request) {
  try {
    await ensureTablesAndColumns();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Also fetch all available tenant modules for quick UI consumption
    const allTenantMods = await queryDb(
      'SELECT * FROM tenant_modules WHERE is_active = TRUE ORDER BY id ASC'
    ).catch(() => ({ rows: [] }));

    if (id) {
      const record = await fetchPackageById(id);
      if (!record) {
        return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        record,
        package: record,
        available_tenant_modules: allTenantMods.rows,
      });
    }

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
                  SELECT json_agg(DISTINCT mod_title ORDER BY mod_title ASC)
                  FROM (
                    SELECT am.module_title AS mod_title
                    FROM allowed_modules am
                    WHERE am.package_id = p.id
                    UNION
                    SELECT tm.name AS mod_title
                    FROM package_modules pm
                    JOIN tenant_modules tm ON pm.tenant_module_id = tm.id
                    WHERE pm.package_id = p.id
                  ) combined_mods
                ),
                '[]'::json
              ) AS allowed_modules
       FROM packages p
       ORDER BY COALESCE(p.monthly_price_usd, p.monthly_price, 0) ASC, p.id ASC`
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      table: 'packages',
      records: res.rows,
      available_tenant_modules: allTenantMods.rows,
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    await ensureTablesAndColumns();

    const body = await request.json();
    const data = body.data || body;
    const name = (data.name || '').trim() || 'Untitled Package';

    const slug = await generateUniqueSlug(name);
    const tagline = (data.tagline || '').trim();
    const description = (data.description || '').trim();

    // 4 Distinct Pricing Fields: USD & BDT (Monthly & Yearly)
    const monthlyPriceUsd = Math.max(
      0,
      Number(
        data.monthly_price_usd !== undefined
          ? data.monthly_price_usd
          : (data.monthly_price !== undefined ? data.monthly_price : 0)
      ) || 0
    );
    const yearlyPriceUsd = Math.max(
      0,
      Number(
        data.yearly_price_usd !== undefined
          ? data.yearly_price_usd
          : (data.yearly_price !== undefined ? data.yearly_price : 0)
      ) || 0
    );
    const monthlyPriceBdt = Math.max(0, Number(data.monthly_price_bdt !== undefined ? data.monthly_price_bdt : 0) || 0);
    const yearlyPriceBdt = Math.max(0, Number(data.yearly_price_bdt !== undefined ? data.yearly_price_bdt : 0) || 0);

    const discountPercentage = Math.min(100, Math.max(0, Number(data.discount_percentage) || 0));

    // Capacity quotas & limits
    const maxStudents = data.max_students !== undefined ? Math.max(1, Number(data.max_students)) : 500;
    const maxTeachers = data.max_teachers !== undefined ? Math.max(1, Number(data.max_teachers)) : 30;
    const maxStaff = data.max_staff !== undefined ? Math.max(1, Number(data.max_staff)) : 20;
    const maxStorageMb = data.max_storage_mb !== undefined ? Math.max(100, Number(data.max_storage_mb)) : 5120;
    const maxWebsites = data.max_websites !== undefined
      ? Math.max(1, Number(data.max_websites))
      : (data.max_portfolios !== undefined ? Math.max(1, Number(data.max_portfolios)) : 1);

    const isPopular = Boolean(data.is_popular);
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;
    const trialDays = data.trial_days !== undefined ? Math.max(0, Number(data.trial_days)) : 14;
    const sortOrder = Number(data.sort_order) || 0;
    const features = Array.isArray(data.features)
      ? JSON.stringify(data.features)
      : (typeof data.features === 'object' && data.features !== null ? JSON.stringify(data.features) : '[]');

    // Optional app_id for backward compatibility
    const appId = data.app_id ? Number(data.app_id) : null;

    const res = await queryDb(
      `INSERT INTO packages (
        name, slug, tagline, description,
        monthly_price_usd, yearly_price_usd, monthly_price_bdt, yearly_price_bdt,
        monthly_price, yearly_price, discount_percentage,
        max_students, max_teachers, max_staff, max_storage_mb, max_websites,
        features, is_popular, is_active, trial_days, sort_order
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17::jsonb, $18, $19, $20, $21
      )
      RETURNING *`,
      [
        name, slug, tagline, description,
        monthlyPriceUsd, yearlyPriceUsd, monthlyPriceBdt, yearlyPriceBdt,
        monthlyPriceUsd, yearlyPriceUsd, discountPercentage,
        maxStudents, maxTeachers, maxStaff, maxStorageMb, maxWebsites,
        features, isPopular, isActive, trialDays, sortOrder
      ]
    );

    const newPackage = res.rows[0];

    // Link Tenant Modules in package_modules table
    let tenantModuleIds = [];
    if (Array.isArray(data.tenant_module_ids)) {
      tenantModuleIds = data.tenant_module_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
    } else if (Array.isArray(data.tenant_modules)) {
      tenantModuleIds = data.tenant_modules
        .map((m) => (typeof m === 'object' && m !== null ? Number(m.id) : Number(m)))
        .filter((n) => !isNaN(n) && n > 0);
    } else if (Array.isArray(data.allowed_modules) || Array.isArray(data.modules)) {
      // Resolve string titles or slugs to tenant_modules IDs
      const rawNames = (data.allowed_modules || data.modules || []).map((x) =>
        String(typeof x === 'object' && x !== null ? x.name || x.slug : x).trim().toLowerCase()
      );
      if (rawNames.length > 0) {
        const resolved = await queryDb(
          `SELECT id FROM tenant_modules WHERE LOWER(name) = ANY($1) OR LOWER(slug) = ANY($1)`,
          [rawNames]
        ).catch(() => ({ rows: [] }));
        tenantModuleIds = resolved.rows.map((r) => r.id);
      }
    }

    // Insert into package_modules
    for (const modId of tenantModuleIds) {
      await queryDb(
        `INSERT INTO package_modules (package_id, tenant_module_id)
         VALUES ($1, $2)
         ON CONFLICT (package_id, tenant_module_id) DO NOTHING`,
        [newPackage.id, modId]
      ).catch((e) => console.warn('Error linking package_module:', e.message));
    }

    // Sync legacy allowed_modules table for backward compatibility
    if (tenantModuleIds.length > 0) {
      const linkedMods = await queryDb(
        `SELECT name FROM tenant_modules WHERE id = ANY($1)`,
        [tenantModuleIds]
      ).catch(() => ({ rows: [] }));

      for (const row of linkedMods.rows) {
        await queryDb(
          `INSERT INTO allowed_modules (package_id, module_title) VALUES ($1, $2)`,
          [newPackage.id, row.name]
        ).catch(() => {});
      }
    }

    const fullPackage = await fetchPackageById(newPackage.id);

    return NextResponse.json({
      success: true,
      message: 'Package created successfully',
      record: fullPackage || newPackage,
      package: fullPackage || newPackage,
    }, { status: 201 });
  } catch (error) {
    console.error('Error processing package POST request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    await ensureTablesAndColumns();

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || body.id || body.packageId || body.data?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM packages WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const data = body.data || body;
    const name = data.name !== undefined ? (data.name || '').trim() : current.name;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Package name cannot be empty' }, { status: 400 });
    }

    let slug = current.slug;
    if (name && name !== current.name) {
      slug = await generateUniqueSlug(name, Number(id));
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
        name, slug, tagline, description,
        monthlyPriceUsd, yearlyPriceUsd, monthlyPriceBdt, yearlyPriceBdt,
        monthlyPriceUsd, yearlyPriceUsd, discountPercentage,
        maxStudents, maxTeachers, maxStaff, maxStorageMb, maxWebsites,
        featuresJson, isPopular, isActive, trialDays, sortOrder,
        Number(id)
      ]
    );

    // Synchronize package_modules if tenant_module_ids provided
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
      await queryDb('DELETE FROM package_modules WHERE package_id = $1', [Number(id)]).catch(() => {});
      await queryDb('DELETE FROM allowed_modules WHERE package_id = $1', [Number(id)]).catch(() => {});

      for (const modId of tenantModuleIds) {
        await queryDb(
          `INSERT INTO package_modules (package_id, tenant_module_id)
           VALUES ($1, $2)
           ON CONFLICT (package_id, tenant_module_id) DO NOTHING`,
          [Number(id), modId]
        ).catch((e) => console.warn('Error syncing package_module:', e.message));
      }

      if (tenantModuleIds.length > 0) {
        const linkedMods = await queryDb(
          `SELECT name FROM tenant_modules WHERE id = ANY($1)`,
          [tenantModuleIds]
        ).catch(() => ({ rows: [] }));

        for (const row of linkedMods.rows) {
          await queryDb(
            `INSERT INTO allowed_modules (package_id, module_title) VALUES ($1, $2)`,
            [Number(id), row.name]
          ).catch(() => {});
        }
      }
    }

    const fullPackage = await fetchPackageById(Number(id));

    return NextResponse.json({
      success: true,
      message: 'Package updated successfully',
      record: fullPackage,
      package: fullPackage,
    });
  } catch (error) {
    console.error('Error updating package PUT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('packageId');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.packageId;
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM packages WHERE id = $1 RETURNING id, name', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Package deleted successfully', deleted: res.rows[0] });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.packageId;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const res = await queryDb(
      `UPDATE packages
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [Number(id)]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    console.error('Error toggling package status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

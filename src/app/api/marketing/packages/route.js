import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

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

function formatPackageRecord(p) {
  let features = [];
  if (Array.isArray(p.features)) {
    features = p.features;
  } else if (typeof p.features === 'string') {
    try {
      features = JSON.parse(p.features);
    } catch {
      features = [];
    }
  }

  const monthlyUsd = Number(
    p.monthly_price_usd !== undefined
      ? p.monthly_price_usd
      : p.monthly_price !== undefined
      ? p.monthly_price
      : p.price_in_cents
      ? p.price_in_cents / 100
      : 0
  ) || 0;

  const yearlyUsd = Number(
    p.yearly_price_usd !== undefined
      ? p.yearly_price_usd
      : p.yearly_price !== undefined
      ? p.yearly_price
      : Math.round(monthlyUsd * 10)
  ) || 0;

  const monthlyBdt = Number(
    p.monthly_price_bdt !== undefined
      ? p.monthly_price_bdt
      : Math.round(monthlyUsd * 120)
  ) || 0;

  const yearlyBdt = Number(
    p.yearly_price_bdt !== undefined
      ? p.yearly_price_bdt
      : Math.round(monthlyBdt * 10)
  ) || 0;

  const maxWebsites = Number(p.max_websites ?? p.max_portfolios ?? 1);

  return {
    ...p,
    id: Number(p.id),
    name: p.name || 'Standard Package',
    slug: p.slug || `package-${p.id}`,
    tagline: p.tagline || '',
    description: p.description || '',
    monthly_price_usd: monthlyUsd,
    yearly_price_usd: yearlyUsd,
    monthly_price_bdt: monthlyBdt,
    yearly_price_bdt: yearlyBdt,
    monthly_price: monthlyUsd,
    yearly_price: yearlyUsd,
    discount_percentage: Number(p.discount_percentage || 0),
    max_students: Number(p.max_students ?? 500),
    max_teachers: Number(p.max_teachers ?? 30),
    max_staff: Number(p.max_staff ?? 20),
    max_storage_mb: Number(p.max_storage_mb ?? 5120),
    max_websites: maxWebsites,
    max_portfolios: maxWebsites,
    is_popular: Boolean(p.is_popular),
    is_active: Boolean(p.is_active),
    trial_days: Number(p.trial_days ?? 14),
    sort_order: Number(p.sort_order ?? 0),
    features,
    tenant_modules: Array.isArray(p.tenant_modules) ? p.tenant_modules : [],
    tenant_module_ids: Array.isArray(p.tenant_module_ids) ? p.tenant_module_ids : [],
    allowed_modules: Array.isArray(p.allowed_modules) ? p.allowed_modules : [],
  };
}

export async function GET(request) {
  try {
    await ensureTablesAndColumns();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    let baseQuery = `
      SELECT p.*,
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
    `;

    if (id || slug) {
      const identifier = id || slug;
      const isNum = !isNaN(Number(identifier));
      const filterClause = isNum
        ? `WHERE (p.id = $1 OR p.slug = $2) AND p.is_active = TRUE LIMIT 1`
        : `WHERE p.slug = $1 AND p.is_active = TRUE LIMIT 1`;
      const params = isNum ? [Number(identifier), String(identifier)] : [String(identifier)];

      const res = await queryDb(`${baseQuery} ${filterClause}`, params);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Package not found.' }, { status: 404 });
      }

      const formatted = formatPackageRecord(res.rows[0]);
      return NextResponse.json({
        success: true,
        package: formatted,
        record: formatted,
      });
    }

    // List all active packages
    const listQuery = `
      ${baseQuery}
      WHERE p.is_active = TRUE
      ORDER BY p.sort_order ASC, COALESCE(p.monthly_price_usd, p.monthly_price, 0) ASC, p.id ASC
    `;

    const res = await queryDb(listQuery);
    const formattedPackages = (res.rows || []).map(formatPackageRecord);

    return NextResponse.json({
      success: true,
      packages: formattedPackages,
      apps: [],
    });
  } catch (error) {
    console.error('Public packages GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch packages.' },
      { status: 500 }
    );
  }
}

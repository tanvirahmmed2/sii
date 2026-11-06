import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

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

  const monthlyBdt = Number(p.monthly_price_bdt ?? 0);
  const yearlyBdt = Number(p.yearly_price_bdt ?? (monthlyBdt ? Math.round(monthlyBdt * 10) : 0));
  const maxStorageMb = Number(p.max_storage_mb ?? 5120);
  const maxStorage = p.max_storage || `${Math.round(maxStorageMb / 1024)} GB`;

  return {
    ...p,
    id: Number(p.id),
    name: p.name || 'Standard Package',
    slug: p.slug || `package-${p.id}`,
    short_description: p.short_description || '',
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
    max_storage: maxStorage,
    max_storage_mb: maxStorageMb,
    is_available_student_panel: p.is_available_student_panel !== false,
    is_available_teacher_panel: p.is_available_teacher_panel !== false,
    is_available_custom_domain: Boolean(p.is_available_custom_domain),
    is_popular: Boolean(p.is_popular),
    is_public: p.is_public !== false,
    is_active: Boolean(p.is_active),
    grace_period: Number(p.grace_period ?? 3),
    sort_order: Number(p.sort_order ?? 0),
    monthly_mail: Number(p.monthly_mail ?? 1000),
    monthly_sms: Number(p.monthly_sms ?? 200),
    features,
    home_modules: Array.isArray(p.home_modules) ? p.home_modules : [],
    home_module_ids: Array.isArray(p.home_module_ids) ? p.home_module_ids : [],
    control_modules: Array.isArray(p.control_modules) ? p.control_modules : [],
    control_module_ids: Array.isArray(p.control_module_ids) ? p.control_module_ids : [],
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    const baseQuery = `
      SELECT p.*,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', hm.id,
                     'name', hm.name,
                     'slug', hm.slug,
                     'path', hm.path,
                     'category', hm.category,
                     'description', hm.description,
                     'icon', hm.icon,
                     'is_active', hm.is_active
                   ) ORDER BY hm.display_order ASC, hm.id ASC
                 )
                 FROM package_home_modules phm
                 JOIN website_home_modules hm ON phm.home_module_id = hm.id
                 WHERE phm.package_id = p.id
               ),
               '[]'::json
             ) AS home_modules,
             COALESCE(
               (
                 SELECT json_agg(phm.home_module_id ORDER BY phm.home_module_id ASC)
                 FROM package_home_modules phm
                 WHERE phm.package_id = p.id
               ),
               '[]'::json
             ) AS home_module_ids,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', cm.id,
                     'name', cm.name,
                     'slug', cm.slug,
                     'path', cm.path,
                     'category', cm.category,
                     'description', cm.description,
                     'icon', cm.icon,
                     'is_active', cm.is_active
                   ) ORDER BY cm.category ASC, cm.display_order ASC, cm.id ASC
                 )
                 FROM package_control_modules pcm
                 JOIN website_control_modules cm ON pcm.control_module_id = cm.id
                 WHERE pcm.package_id = p.id
               ),
               '[]'::json
             ) AS control_modules,
             COALESCE(
               (
                 SELECT json_agg(pcm.control_module_id ORDER BY pcm.control_module_id ASC)
                 FROM package_control_modules pcm
                 WHERE pcm.package_id = p.id
               ),
               '[]'::json
             ) AS control_module_ids
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

    // List all active public packages (strictly hide custom / private plans)
    const listQuery = `
      ${baseQuery}
      WHERE p.is_active = TRUE AND p.is_public = TRUE
      ORDER BY p.sort_order ASC, COALESCE(p.monthly_price_usd, p.monthly_price, 0) ASC, p.id ASC
    `;

    const res = await queryDb(listQuery);
    const formattedPackages = (res.rows || [])
      .map(formatPackageRecord)
      .filter((p) => p.is_public === true && p.is_active === true);

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

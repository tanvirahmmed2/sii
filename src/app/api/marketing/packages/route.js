import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || searchParams.get('app_id') || searchParams.get('app');
    const id = searchParams.get('id');

    let query = `
      SELECT 
        p.*,
        a.title AS app_title,
        a.slug AS app_slug,
        COALESCE(
          json_agg(DISTINCT am.module_title) FILTER (WHERE am.id IS NOT NULL),
          '[]'::json
        ) AS allowed_modules,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', f.id,
              'name', f.name,
              'key', f.key,
              'description', f.description,
              'value', pf.value,
              'is_enabled', pf.is_enabled
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::json
        ) AS features
      FROM packages p
      LEFT JOIN apps a ON p.app_id = a.id
      LEFT JOIN allowed_modules am ON p.id = am.package_id
      LEFT JOIN packages_feature pf ON p.id = pf.package_id
      LEFT JOIN feature f ON pf.feature_id = f.id
      WHERE p.is_active = TRUE
    `;

    const params = [];
    if (id) {
      query += ` AND p.id = $1 GROUP BY p.id, a.id LIMIT 1`;
      params.push(Number(id));
    } else if (appId && appId !== 'ALL' && appId !== 'all') {
      if (!isNaN(appId)) {
        query += ` AND p.app_id = $1 GROUP BY p.id, a.id ORDER BY COALESCE(p.monthly_price_usd, p.price_in_cents / 100.0, 0) ASC, p.id ASC`;
        params.push(Number(appId));
      } else {
        query += ` AND LOWER(a.slug) = $1 GROUP BY p.id, a.id ORDER BY COALESCE(p.monthly_price_usd, p.price_in_cents / 100.0, 0) ASC, p.id ASC`;
        params.push(appId.toLowerCase());
      }
    } else {
      query += ` GROUP BY p.id, a.id ORDER BY COALESCE(p.monthly_price_usd, p.price_in_cents / 100.0, 0) ASC, p.id ASC`;
    }

    const appsQuery = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.short_description,
        COUNT(p.id)::int AS package_count
      FROM apps a
      LEFT JOIN packages p ON p.app_id = a.id AND p.is_active = TRUE
      WHERE a.is_published = TRUE
      GROUP BY a.id, a.title, a.slug, a.short_description
      ORDER BY a.title ASC
    `;

    const [res, appsRes] = await Promise.all([
      queryDb(query, params).catch((err) => {
        console.error('Error fetching packages:', err);
        return { rows: [] };
      }),
      queryDb(appsQuery).catch((err) => {
        console.error('Error fetching apps for packages categories:', err);
        return { rows: [] };
      }),
    ]);

    if (id) {
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Package not found.' }, { status: 404 });
      }
      const record = res.rows[0];
      return NextResponse.json({
        success: true,
        package: {
          ...record,
          max_websites: Number(record.max_websites ?? record.max_portfolios ?? 1),
          max_portfolios: Number(record.max_websites ?? record.max_portfolios ?? 1),
          monthly_price_usd: Number(record.monthly_price_usd ?? ((record.price_in_cents || 0) / 100)),
          yearly_price_usd: Number(record.yearly_price_usd ?? 0),
          monthly_price_bdt: Number(record.monthly_price_bdt ?? 0),
          yearly_price_bdt: Number(record.yearly_price_bdt ?? 0),
        },
      });
    }

    const formattedPackages = (res.rows || []).map((p) => ({
      ...p,
      max_websites: Number(p.max_websites ?? p.max_portfolios ?? 1),
      max_portfolios: Number(p.max_websites ?? p.max_portfolios ?? 1),
      monthly_price_usd: Number(p.monthly_price_usd ?? ((p.price_in_cents || 0) / 100)),
      yearly_price_usd: Number(p.yearly_price_usd ?? 0),
      monthly_price_bdt: Number(p.monthly_price_bdt ?? 0),
      yearly_price_bdt: Number(p.yearly_price_bdt ?? 0),
    }));

    return NextResponse.json({
      success: true,
      packages: formattedPackages,
      apps: appsRes.rows || [],
    });
  } catch (error) {
    console.error('Public packages GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch packages.' },
      { status: 500 }
    );
  }
}

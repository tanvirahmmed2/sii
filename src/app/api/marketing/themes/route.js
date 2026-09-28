import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Public list of active themes categorized by apps
// ============================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appFilter = searchParams.get('app') || searchParams.get('app_id') || '';
    const search = searchParams.get('search') || '';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit'), 10) : null;

    // 1. Build query for active themes joined with apps table
    const conditions = ['t.is_active = TRUE'];
    const params = [];

    if (appFilter && appFilter !== 'ALL' && appFilter !== 'all') {
      if (!isNaN(appFilter)) {
        params.push(Number(appFilter));
        conditions.push(`t.app_id = $${params.length}`);
      } else {
        params.push(appFilter.toLowerCase());
        conditions.push(`LOWER(a.slug) = $${params.length}`);
      }
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(t.name) LIKE $${idx} OR 
        LOWER(COALESCE(t.description, '')) LIKE $${idx} OR 
        LOWER(COALESCE(t.category, '')) LIKE $${idx} OR
        LOWER(COALESCE(a.title, '')) LIKE $${idx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let themesQuery = `
      SELECT 
        t.id,
        t.app_id,
        t.name,
        t.slug,
        t.description,
        t.category,
        t.preview_image,
        t.theme_config,
        t.is_active,
        t.is_premium,
        t.created_at,
        t.updated_at,
        a.title AS app_title,
        a.slug AS app_slug,
        a.short_description AS app_short_description
      FROM themes t
      LEFT JOIN apps a ON t.app_id = a.id
      ${whereClause}
      ORDER BY t.id DESC
    `;

    if (limit && !isNaN(limit) && limit > 0) {
      params.push(limit);
      themesQuery += ` LIMIT $${params.length}`;
    }

    // 2. Query for published apps to build categories
    const appsQuery = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.short_description,
        COUNT(t.id)::int AS theme_count
      FROM apps a
      LEFT JOIN themes t ON t.app_id = a.id AND t.is_active = TRUE
      WHERE a.is_published = TRUE
      GROUP BY a.id, a.title, a.slug, a.short_description
      ORDER BY a.title ASC
    `;

    const [themesResult, appsResult] = await Promise.all([
      queryDb(themesQuery, params).catch((err) => {
        console.error('Error fetching themes:', err);
        return { rows: [] };
      }),
      queryDb(appsQuery).catch((err) => {
        console.error('Error fetching apps for categories:', err);
        return { rows: [] };
      }),
    ]);

    return NextResponse.json({
      success: true,
      themes: themesResult.rows || [],
      apps: appsResult.rows || [],
    });
  } catch (error) {
    console.error('Failed to load themes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

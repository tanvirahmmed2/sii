import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: Public list of active themes
// ============================================================================
export async function GET(request) {
  try {

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit'), 10) : null;

    const conditions = ['COALESCE(t.is_active, TRUE) = TRUE'];
    const params = [];

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(t.name) LIKE $${idx} OR 
        LOWER(COALESCE(t.description, '')) LIKE $${idx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let themesQuery = `
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.description,
        t.preview_image,
        t.preview_url,
        t.price,
        t.is_active,
        t.created_at,
        t.updated_at,
        (COALESCE(t.price, 0) > 0) AS is_premium
      FROM themes t
      ${whereClause}
      ORDER BY t.id DESC
    `;

    if (limit && !isNaN(limit) && limit > 0) {
      params.push(limit);
      themesQuery += ` LIMIT $${params.length}`;
    }

    const themesResult = await queryDb(themesQuery, params).catch((err) => {
      console.warn('Error fetching themes from DB:', err.message);
      return { rows: [] };
    });

    return NextResponse.json({
      success: true,
      themes: themesResult.rows || [],
      apps: [],
    });
  } catch (error) {
    console.error('Failed to load themes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch themes', themes: [], apps: [] },
      { status: 500 }
    );
  }
}

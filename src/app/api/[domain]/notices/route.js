import { NextResponse } from 'next/server.js';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public notices list (supports ?limit=N, ?home=true, ?audience=..., ?search=...)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const isHome = searchParams.get('home') === 'true';
    const audience = searchParams.get('audience')?.trim();
    const search = searchParams.get('search')?.trim();

    const params = [website.id];
    let sql = `
      SELECT id,
             website_id,
             title,
             slug,
             pdf_url,
             pdf_id,
             file_name,
             file_size,
             drive_url,
             COALESCE(pdf_url, drive_url) AS file_url,
             description,
             target_audience,
             is_pinned,
             published_date,
             expiry_date,
             views_count,
             is_active,
             created_at,
             updated_at
      FROM website_notices
      WHERE website_id = $1 AND is_active = true
    `;

    if (audience && audience.toLowerCase() !== 'all') {
      params.push(audience);
      sql += ` AND LOWER(target_audience) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (title ILIKE $${params.length} OR slug ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    sql += ` ORDER BY is_pinned DESC, published_date DESC, id DESC`;

    if (limitParam && !isNaN(parseInt(limitParam, 10))) {
      params.push(parseInt(limitParam, 10));
      sql += ` LIMIT $${params.length}`;
    } else if (isHome) {
      params.push(6);
      sql += ` LIMIT $${params.length}`;
    }

    const result = await queryDb(sql, params);

    return NextResponse.json({
      success: true,
      notices: result.rows,
      payload: { notices: result.rows },
      paylod: { notices: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching public notices in home/notices:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

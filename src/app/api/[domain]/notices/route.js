import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public notices list (supports ?limit=N and ?home=true)
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

    let limitClause = '';
    const params = [website.id];

    if (limitParam && !isNaN(parseInt(limitParam, 10))) {
      limitClause = ` LIMIT $2`;
      params.push(parseInt(limitParam, 10));
    } else if (isHome) {
      limitClause = ` LIMIT 4`;
    }

    const result = await queryDb(
      `SELECT id,
              title,
              slug,
              drive_url,
              description,
              published_date,
              is_active,
              created_at,
              updated_at
       FROM website_notices
       WHERE website_id = $1 AND is_active = true
       ORDER BY published_date DESC, id DESC
       ${limitClause}`,
      params
    );

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

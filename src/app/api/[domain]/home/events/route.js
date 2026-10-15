import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public events list (supports ?limit=N and ?home=true)
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
      limitClause = ` LIMIT 3`;
    }

    const result = await queryDb(
      `SELECT id,
              website_id,
              title,
              slug,
              description,
              location,
              event_date,
              end_date,
              image,
              image_id,
              is_applicable,
              is_active,
              created_at,
              updated_at,
              COALESCE((SELECT COUNT(*) FROM events_applicants ea WHERE ea.event_id = e.id), 0)::int AS applicant_count
       FROM events e
       WHERE e.website_id = $1 AND e.is_active = true
       ORDER BY e.event_date DESC, e.id DESC
       ${limitClause}`,
      params
    );

    return NextResponse.json({
      success: true,
      events: result.rows,
      payload: { events: result.rows },
      paylod: { events: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching public events in home/events:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

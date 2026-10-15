import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Single event details
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Event identifier required' }, { status: 400 });
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
       WHERE e.website_id = $1 AND (e.slug = $2 OR e.id::text = $2)
       LIMIT 1`,
      [website.id, slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const event = result.rows[0];

    return NextResponse.json({
      success: true,
      event,
      payload: { event },
      paylod: { event },
    });
  } catch (error) {
    console.error('Error fetching event detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

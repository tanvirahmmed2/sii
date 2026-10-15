import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Single notice by slug or ID
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
      return NextResponse.json({ success: false, error: 'Notice identifier required' }, { status: 400 });
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
       WHERE website_id = $1 AND (slug = $2 OR id::text = $2)
       LIMIT 1`,
      [website.id, slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found' }, { status: 404 });
    }

    const notice = result.rows[0];

    return NextResponse.json({
      success: true,
      notice,
      payload: { notice },
      paylod: { notice },
    });
  } catch (error) {
    console.error('Error fetching notice detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server.js';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

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
       WHERE website_id = $1 AND (slug = $2 OR id::text = $2)
       LIMIT 1`,
      [website.id, slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found' }, { status: 404 });
    }

    const notice = result.rows[0];

    queryDb(`UPDATE website_notices SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1`, [notice.id]).catch(() => {});

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

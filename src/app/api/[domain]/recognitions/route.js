import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public awards & institutional recognitions
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const result = await queryDb(
      `SELECT a.id,
              a.title,
              a.slug,
              a.description,
              a.year,
              a.issuer,
              a.is_active,
              a.created_at,
              COALESCE(ai.image_url, null) AS image,
              COALESCE(ai.image_url, null) AS image_url,
              ai.caption
       FROM website_awards a
       LEFT JOIN website_award_images ai ON ai.award_id = a.id AND ai.website_id = a.website_id
       WHERE a.website_id = $1 AND a.is_active = true
       ORDER BY a.year DESC NULLS LAST, a.id DESC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      recognitions: result.rows,
      awards: result.rows,
      payload: { recognitions: result.rows, awards: result.rows },
      paylod: { recognitions: result.rows, awards: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching recognitions in home/recognitions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

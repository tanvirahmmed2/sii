import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Society and club news dispatches
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
      `SELECT n.id,
              n.title,
              n.slug,
              n.summary,
              n.content,
              n.category,
              n.published_date,
              n.is_published,
              n.created_at,
              COALESCE(
                (SELECT img.image_url
                 FROM website_news_images img
                 WHERE img.news_id = n.id AND img.website_id = n.website_id
                 ORDER BY img.is_cover DESC, img.display_order ASC
                 LIMIT 1),
                null
              ) AS image,
              c.id AS club_id,
              c.name AS club_name
       FROM website_news n
       LEFT JOIN website_clubs c ON c.website_id = n.website_id AND (LOWER(c.name) = LOWER(n.category) OR n.title ILIKE '%' || c.name || '%')
       WHERE n.website_id = $1 AND n.is_published = true
       ORDER BY n.published_date DESC, n.id DESC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      clubNews: result.rows,
      payload: { clubNews: result.rows },
      paylod: { clubNews: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching club news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public news articles list (supports ?limit=N and ?home=true)
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
      limitClause = ` LIMIT 6`;
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
              n.updated_at,
              COALESCE(
                (SELECT img.image_url
                 FROM website_news_images img
                 WHERE img.news_id = n.id AND img.website_id = n.website_id
                 ORDER BY img.is_cover DESC, img.display_order ASC, img.id ASC
                 LIMIT 1),
                null
              ) AS image,
              COALESCE(
                (SELECT json_agg(json_build_object('id', img.id, 'image_url', img.image_url, 'caption', img.caption, 'is_cover', img.is_cover) ORDER BY img.display_order ASC)
                 FROM website_news_images img
                 WHERE img.news_id = n.id AND img.website_id = n.website_id),
                '[]'::json
              ) AS images
       FROM website_news n
       WHERE n.website_id = $1 AND n.is_published = true
       ORDER BY n.published_date DESC, n.id DESC
       ${limitClause}`,
      params
    );

    return NextResponse.json({
      success: true,
      news: result.rows,
      payload: { news: result.rows },
      paylod: { news: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching public news in home/news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

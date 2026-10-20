import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Single news story with full gallery
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
      return NextResponse.json({ success: false, error: 'News article identifier required' }, { status: 400 });
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
       WHERE n.website_id = $1 AND (n.slug = $2 OR n.id::text = $2)
       LIMIT 1`,
      [website.id, slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'News article not found' }, { status: 404 });
    }

    const newsItem = result.rows[0];

    return NextResponse.json({
      success: true,
      news: newsItem,
      payload: { news: newsItem },
      paylod: { news: newsItem },
    });
  } catch (error) {
    console.error('Error fetching news detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

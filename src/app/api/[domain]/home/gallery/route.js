import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Aggregated public gallery images across events, news, awards, and club news
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

    // Pagination params
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;

    const limitParam = parseInt(searchParams.get('limit') || '12', 10);
    const limit = !isNaN(limitParam) && limitParam > 0 && limitParam <= 100 ? limitParam : 12;

    const offset = (page - 1) * limit;

    // Optional category / table filter ('all', 'events', 'news', 'awards', 'club-news')
    const filterTable = searchParams.get('table') || searchParams.get('category');
    const cleanFilter = filterTable ? filterTable.toLowerCase().trim() : 'all';

    // Build the query fragments
    const fragments = [];

    // 1. Events images
    if (cleanFilter === 'all' || cleanFilter === 'events') {
      fragments.push(`
        SELECT 
          e.image AS image,
          'events' AS table_name,
          'events' AS "tableName",
          e.slug AS slug,
          e.title AS title,
          e.created_at AS created_at
        FROM website_events e
        WHERE e.website_id = $1 
          AND e.is_active = true 
          AND e.image IS NOT NULL 
          AND TRIM(e.image) != ''
      `);
    }

    // 2. News images
    if (cleanFilter === 'all' || cleanFilter === 'news') {
      fragments.push(`
        SELECT 
          img.image_url AS image,
          'news' AS table_name,
          'news' AS "tableName",
          n.slug AS slug,
          n.title AS title,
          n.created_at AS created_at
        FROM website_news n
        JOIN website_news_images img ON img.news_id = n.id AND img.website_id = n.website_id
        WHERE n.website_id = $1 
          AND n.is_published = true 
          AND img.image_url IS NOT NULL 
          AND TRIM(img.image_url) != ''
      `);
    }

    // 3. Awards images
    if (cleanFilter === 'all' || cleanFilter === 'awards' || cleanFilter === 'recognitions') {
      fragments.push(`
        SELECT 
          ai.image_url AS image,
          'awards' AS table_name,
          'awards' AS "tableName",
          a.slug AS slug,
          a.title AS title,
          a.created_at AS created_at
        FROM website_awards a
        JOIN website_award_images ai ON ai.award_id = a.id AND ai.website_id = a.website_id
        WHERE a.website_id = $1 
          AND a.is_active = true 
          AND ai.image_url IS NOT NULL 
          AND TRIM(ai.image_url) != ''
      `);
    }

    // 4. Club News images
    if (cleanFilter === 'all' || cleanFilter === 'club-news' || cleanFilter === 'club_news' || cleanFilter === 'clubs') {
      fragments.push(`
        SELECT 
          cn.image_url AS image,
          'club-news' AS table_name,
          'club-news' AS "tableName",
          cn.slug AS slug,
          cn.title AS title,
          cn.created_at AS created_at
        FROM website_club_news cn
        WHERE cn.website_id = $1 
          AND cn.is_published = true 
          AND cn.image_url IS NOT NULL 
          AND TRIM(cn.image_url) != ''
      `);
    }

    if (fragments.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        gallery: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    const unionSql = fragments.join(' UNION ALL ');

    // Count total matching images
    const countSql = `
      WITH combined_gallery AS (
        ${unionSql}
      )
      SELECT COUNT(*)::int AS total FROM combined_gallery
    `;
    const countRes = await queryDb(countSql, [website.id]);
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Query paginated items
    const dataSql = `
      WITH combined_gallery AS (
        ${unionSql}
      )
      SELECT 
        image,
        table_name,
        "tableName",
        slug,
        title,
        created_at
      FROM combined_gallery
      ORDER BY created_at DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    const dataRes = await queryDb(dataSql, [website.id, limit, offset]);
    const items = dataRes.rows;

    const pagination = {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };

    return NextResponse.json({
      success: true,
      items,
      gallery: items,
      payload: {
        items,
        gallery: items,
        pagination,
      },
      paylod: {
        items,
        gallery: items,
        pagination,
      },
      pagination,
    });
  } catch (error) {
    console.error('Error fetching aggregated home/gallery images:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

// GET: Public endpoint returning approved client reviews with pagination & limit support
// Conforms strictly to Table 19 (reviews) in psql/schema.psql
export async function GET(request) {
  try {

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const ratingParam = searchParams.get('rating');

    // Base condition: only approved reviews
    const whereConditions = ['COALESCE(r.is_approved, TRUE) = TRUE'];
    const queryParams = [];

    if (ratingParam && ratingParam !== 'ALL') {
      const rNum = parseInt(ratingParam, 10);
      if (!isNaN(rNum) && rNum >= 1 && rNum <= 5) {
        queryParams.push(rNum);
        whereConditions.push(`r.rating = $${queryParams.length}`);
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Total matching records for pagination
    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total FROM reviews r ${whereClause}`,
      queryParams
    ).catch(() => ({ rows: [{ total: 0 }] }));
    const totalCount = countRes.rows[0]?.total || 0;

    // Overall stats for all approved reviews
    const statsRes = await queryDb(
      `SELECT r.rating
       FROM reviews r
       WHERE COALESCE(r.is_approved, TRUE) = TRUE`
    ).catch(() => ({ rows: [] }));

    const allApproved = statsRes.rows || [];
    const totalApproved = allApproved.length;
    const sumRatings = allApproved.reduce((sum, r) => sum + Number(r.rating || 5), 0);
    const averageRating = totalApproved > 0 ? (sumRatings / totalApproved).toFixed(1) : '5.0';

    const ratingBreakdown = {
      5: allApproved.filter((r) => Number(r.rating) === 5).length,
      4: allApproved.filter((r) => Number(r.rating) === 4).length,
      3: allApproved.filter((r) => Number(r.rating) === 3).length,
      2: allApproved.filter((r) => Number(r.rating) === 2).length,
      1: allApproved.filter((r) => Number(r.rating) === 1).length,
    };

    // Build SELECT query
    let selectQuery = `
      SELECT r.id,
              r.creator_id,
              r.website_id,
              r.reviewer_name,
              r.institution_name,
              r.rating,
              r.title,
              r.review_text,
              r.review_text AS comment,
              r.is_featured,
              r.is_approved,
              'APPROVED' AS status,
              r.created_at,
              COALESCE(c.name, r.reviewer_name, 'Verified Client') AS creator_name,
              NULL::text AS creator_avatar,
              COALESCE(p.name, r.institution_name, 'SaaS Client') AS package_name,
              p.slug AS package_slug
       FROM reviews r
       LEFT JOIN creators c ON r.creator_id = c.id
       LEFT JOIN websites w ON r.website_id = w.id
       LEFT JOIN subscriptions sub ON w.subscription_id = sub.id
       LEFT JOIN packages p ON sub.package_id = p.id
       ${whereClause}
       ORDER BY r.is_featured DESC, r.created_at DESC, r.id DESC
    `;

    let page = null;
    let limit = null;
    let totalPages = 1;

    if (pageParam || limitParam) {
      page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
      limit = Math.max(1, parseInt(limitParam || '10', 10) || 10);
      totalPages = Math.max(1, Math.ceil(totalCount / limit));
      const offset = (page - 1) * limit;

      queryParams.push(limit);
      selectQuery += ` LIMIT $${queryParams.length}`;
      queryParams.push(offset);
      selectQuery += ` OFFSET $${queryParams.length}`;
    }

    const res = await queryDb(selectQuery, queryParams).catch(() => ({ rows: [] }));
    const reviews = res.rows || [];

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page: page || 1,
        limit: limit || reviews.length,
        total: totalCount,
        totalPages,
        hasMore: page ? page < totalPages : false,
      },
      stats: {
        totalApproved,
        averageRating,
        ratingBreakdown,
      },
    });
  } catch (error) {
    console.error('Error in public GET /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

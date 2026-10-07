import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const featuredParam = searchParams.get('featured');

    const limit = Math.min(Math.max(1, parseInt(limitParam || '12', 10) || 12), 50);

    const whereConditions = ['COALESCE(r.is_approved, TRUE) = TRUE'];
    const queryParams = [];

    if (featuredParam === 'true' || featuredParam === '1') {
      whereConditions.push('r.is_featured = TRUE');
    }

    queryParams.push(limit);
    const limitIndex = queryParams.length;

    const queryText = `
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
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY r.is_featured DESC, r.rating DESC, r.created_at DESC, r.id DESC
      LIMIT $${limitIndex}
    `;

    const res = await queryDb(queryText, queryParams);
    const reviews = res?.rows || [];

    return NextResponse.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error('Error in GET /api/marketing/reviews/home:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch reviews',
        reviews: [],
      },
      { status: 500 }
    );
  }
}

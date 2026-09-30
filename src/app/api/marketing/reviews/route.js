import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

// GET: Public endpoint returning all approved client reviews
export async function GET() {
  try {
    const res = await queryDb(
      `SELECT r.id,
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
              COALESCE(c.name, r.reviewer_name) AS creator_name,
              NULL::text AS creator_avatar,
              COALESCE(p.name, r.institution_name, 'SaaS Client') AS package_name,
              p.slug AS package_slug
       FROM reviews r
       LEFT JOIN creators c ON r.creator_id = c.id
       LEFT JOIN websites w ON r.website_id = w.id
       LEFT JOIN packages p ON w.package_id = p.id
       WHERE r.is_approved = TRUE
       ORDER BY r.is_featured DESC, r.created_at DESC, r.id DESC`
    );

    const reviews = res.rows || [];

    // Compute stats
    const totalApproved = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
    const averageRating = totalApproved > 0 ? (sumRatings / totalApproved).toFixed(1) : '5.0';

    const ratingBreakdown = {
      5: reviews.filter((r) => Number(r.rating) === 5).length,
      4: reviews.filter((r) => Number(r.rating) === 4).length,
      3: reviews.filter((r) => Number(r.rating) === 3).length,
      2: reviews.filter((r) => Number(r.rating) === 2).length,
      1: reviews.filter((r) => Number(r.rating) === 1).length,
    };

    return NextResponse.json({
      success: true,
      reviews,
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

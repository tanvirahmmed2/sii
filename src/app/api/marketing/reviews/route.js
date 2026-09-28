import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

// GET: Public endpoint returning all approved client reviews
export async function GET() {
  try {
    const res = await queryDb(
      `SELECT r.id,
              r.creator_id,
              r.subscription_id,
              r.rating,
              r.title,
              r.comment,
              r.status,
              r.created_at,
              c.name AS creator_name,
              NULL::text AS creator_avatar,
              c.bio AS creator_bio,
              p.name AS package_name,
              p.slug AS package_slug
       FROM reviews r
       JOIN creators c ON r.creator_id = c.id
       JOIN subscription s ON r.subscription_id = s.id
       JOIN packages p ON s.package_id = p.id
       WHERE r.status = 'APPROVED'
       ORDER BY r.created_at DESC, r.id DESC`
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

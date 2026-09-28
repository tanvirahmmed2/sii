import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

// GET: Fetch creator's subscriptions and submitted reviews
export async function GET(request) {
  try {
    const creator = await getCreatorSession(request);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Creator session required' },
        { status: 401 }
      );
    }

    const creatorId = creator.id;

    // Fetch all subscriptions for this creator
    const subsRes = await queryDb(
      `SELECT s.id,
              s.creator_id,
              s.package_id,
              s.status,
              s.current_period_start,
              s.current_period_end,
              s.created_at,
              p.name AS package_name,
              p.slug AS package_slug,
              p.price_in_cents,
              p.billing_interval
       FROM subscription s
       JOIN packages p ON s.package_id = p.id
       WHERE s.creator_id = $1
       ORDER BY s.id DESC`,
      [creatorId]
    );

    // Fetch all reviews submitted by this creator
    const reviewsRes = await queryDb(
      `SELECT r.*,
              p.name AS package_name,
              p.slug AS package_slug
       FROM reviews r
       JOIN subscription s ON r.subscription_id = s.id
       JOIN packages p ON s.package_id = p.id
       WHERE r.creator_id = $1
       ORDER BY r.id DESC`,
      [creatorId]
    );

    const subscriptions = subsRes.rows || [];
    const reviews = reviewsRes.rows || [];

    // Map each subscription with its review status
    const subscriptionList = subscriptions.map((sub) => {
      const existingReview = reviews.find((r) => r.subscription_id === sub.id) || null;
      return {
        ...sub,
        hasReviewed: Boolean(existingReview),
        review: existingReview,
      };
    });

    return NextResponse.json({
      success: true,
      subscriptions: subscriptionList,
      reviews,
    });
  } catch (error) {
    console.error('Error in GET /api/creator/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST: Create a review for a specific subscription (strictly once per subscription)
export async function POST(request) {
  try {
    const creator = await getCreatorSession(request);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Creator session required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const subscriptionId = Number(body.subscription_id || body.subscriptionId);
    const rating = Number(body.rating);
    const title = (body.title || '').trim();
    const comment = (body.comment || '').trim();

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID is required.' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Review comment cannot be empty.' },
        { status: 400 }
      );
    }

    // 1. Verify subscription belongs to this creator
    const subCheck = await queryDb(
      'SELECT id, creator_id, status FROM subscription WHERE id = $1 AND creator_id = $2 LIMIT 1',
      [subscriptionId, creator.id]
    );

    if (subCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found or does not belong to your account.' },
        { status: 404 }
      );
    }

    // 2. Strict Rule: One review per subscription (check if already reviewed)
    const existingCheck = await queryDb(
      'SELECT id FROM reviews WHERE subscription_id = $1 LIMIT 1',
      [subscriptionId]
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already submitted a review for this subscription. Each subscription can only be reviewed once.',
        },
        { status: 409 }
      );
    }

    // 3. Insert review with PENDING status
    const insertRes = await queryDb(
      `INSERT INTO reviews (creator_id, subscription_id, rating, title, comment, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [creator.id, subscriptionId, rating, title || null, comment]
    );

    return NextResponse.json({
      success: true,
      message: 'Your review has been submitted successfully! It will appear on the public site once approved by management.',
      review: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error in POST /api/creator/reviews:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      return NextResponse.json(
        { success: false, error: 'A review for this subscription already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}

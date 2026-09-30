import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

// GET: Fetch the creator's submitted review and eligibility
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

    // Fetch single review submitted by this creator (one review per creator rule)
    const reviewRes = await queryDb(
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
              CASE WHEN r.is_approved = TRUE THEN 'APPROVED' ELSE 'PENDING' END AS status,
              r.created_at,
              r.updated_at,
              w.name AS website_name,
              w.subdomain AS website_subdomain
       FROM reviews r
       LEFT JOIN websites w ON r.website_id = w.id
       WHERE r.creator_id = $1
       ORDER BY r.id DESC
       LIMIT 1`,
      [creatorId]
    );

    // Fetch creator's websites if any to allow associating review
    const websitesRes = await queryDb(
      `SELECT id, name, subdomain, custom_domain 
       FROM websites 
       WHERE creator_id = $1 
       ORDER BY id ASC`,
      [creatorId]
    );

    const review = reviewRes.rows[0] || null;

    return NextResponse.json({
      success: true,
      hasReviewed: Boolean(review),
      review,
      reviews: review ? [review] : [],
      creator: {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        institution: creator.institution,
      },
      websites: websitesRes.rows || [],
    });
  } catch (error) {
    console.error('Error in GET /api/creator/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

// POST: Create a review as PENDING (strictly one review per creator)
export async function POST(request) {
  try {
    const creator = await getCreatorSession(request);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Creator session required' },
        { status: 401 }
      );
    }

    // 1. Strict Rule: Only one review per creator
    const existingCheck = await queryDb(
      'SELECT id FROM reviews WHERE creator_id = $1 LIMIT 1',
      [creator.id]
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already submitted a review. Each creator can only submit one review.',
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const rating = Number(body.rating);
    const title = (body.title || '').trim();
    const reviewText = (body.review_text || body.comment || '').trim();
    const institutionName = (body.institution_name || creator.institution || '').trim();
    const reviewerName = (body.reviewer_name || creator.name || 'Verified Creator').trim();
    const websiteId = body.website_id ? Number(body.website_id) : null;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    if (!reviewText) {
      return NextResponse.json(
        { success: false, error: 'Review text cannot be empty.' },
        { status: 400 }
      );
    }

    // Optional: Validate website belongs to this creator if provided
    if (websiteId) {
      const siteCheck = await queryDb(
        'SELECT id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1',
        [websiteId, creator.id]
      );
      if (siteCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Selected website does not belong to your account.' },
          { status: 400 }
        );
      }
    }

    // 2. Insert review as pending (is_approved = false)
    const insertRes = await queryDb(
      `INSERT INTO reviews (creator_id, website_id, reviewer_name, institution_name, rating, title, review_text, is_featured, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, FALSE)
       RETURNING id, creator_id, website_id, reviewer_name, institution_name, rating, title, review_text, review_text AS comment, is_featured, is_approved, 'PENDING' AS status, created_at, updated_at`,
      [
        creator.id,
        websiteId,
        reviewerName,
        institutionName || null,
        rating,
        title || null,
        reviewText,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Your review has been submitted successfully! It is pending approval by management and will appear publicly once approved.',
      review: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error in POST /api/creator/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}

// PUT: Update existing review (resets approval status to pending for re-moderation)
export async function PUT(request) {
  try {
    const creator = await getCreatorSession(request);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Creator session required' },
        { status: 401 }
      );
    }

    const existingRes = await queryDb(
      'SELECT id FROM reviews WHERE creator_id = $1 LIMIT 1',
      [creator.id]
    );

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No review found to update.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const rating = Number(body.rating);
    const title = (body.title || '').trim();
    const reviewText = (body.review_text || body.comment || '').trim();
    const institutionName = (body.institution_name || creator.institution || '').trim();
    const reviewerName = (body.reviewer_name || creator.name || 'Verified Creator').trim();
    const websiteId = body.website_id ? Number(body.website_id) : null;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    if (!reviewText) {
      return NextResponse.json(
        { success: false, error: 'Review text cannot be empty.' },
        { status: 400 }
      );
    }

    const updateRes = await queryDb(
      `UPDATE reviews
       SET reviewer_name = $1,
           institution_name = $2,
           rating = $3,
           title = $4,
           review_text = $5,
           website_id = $6,
           is_approved = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE creator_id = $7
       RETURNING id, creator_id, website_id, reviewer_name, institution_name, rating, title, review_text, review_text AS comment, is_featured, is_approved, 'PENDING' AS status, created_at, updated_at`,
      [
        reviewerName,
        institutionName || null,
        rating,
        title || null,
        reviewText,
        websiteId,
        creator.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully! It has been submitted for approval.',
      review: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error in PUT /api/creator/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE: Creator can delete their submitted review
export async function DELETE(request) {
  try {
    const creator = await getCreatorSession(request);
    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Creator session required' },
        { status: 401 }
      );
    }

    const res = await queryDb(
      'DELETE FROM reviews WHERE creator_id = $1 RETURNING id',
      [creator.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No review found to delete.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your review has been successfully removed.',
    });
  } catch (error) {
    console.error('Error in DELETE /api/creator/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}

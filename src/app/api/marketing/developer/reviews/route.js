import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

// GET: Fetch all reviews for developer moderation oversight
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'reviews');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Permission reviews required' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    let queryText = `
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
             CASE WHEN r.is_approved = TRUE THEN 'APPROVED' ELSE 'PENDING' END AS status,
             r.created_at,
             r.updated_at,
             COALESCE(c.name, r.reviewer_name) AS creator_name,
             c.email AS creator_email,
             NULL::text AS creator_avatar,
             w.name AS website_name,
             w.subdomain AS website_subdomain,
             COALESCE(p.name, r.institution_name, 'SaaS Client') AS package_name,
             p.slug AS package_slug
      FROM reviews r
      LEFT JOIN creators c ON r.creator_id = c.id
      LEFT JOIN websites w ON r.website_id = w.id
      LEFT JOIN packages p ON w.package_id = p.id
    `;

    const params = [];
    if (statusParam && statusParam !== 'ALL') {
      const upper = statusParam.toUpperCase();
      if (upper === 'APPROVED') {
        params.push(true);
        queryText += ' WHERE r.is_approved = $1';
      } else if (upper === 'PENDING' || upper === 'REJECTED') {
        params.push(false);
        queryText += ' WHERE r.is_approved = $1';
      } else if (upper === 'FEATURED') {
        params.push(true);
        queryText += ' WHERE r.is_featured = $1';
      }
    }

    queryText += ' ORDER BY r.created_at DESC, r.id DESC';

    const res = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      reviews: res.rows || [],
      records: res.rows || [],
    });
  } catch (error) {
    console.error('Error in GET /api/developer/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// PUT: Moderate review status (approve or set pending) and featured state
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'reviews');
    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          error: auth.message || 'Access denied: Permission reviews required to approve or reject reviews.',
        },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const reviewId = Number(body.reviewId || body.id || body.data?.id);
    const status = String(body.status || body.data?.status || '').toUpperCase();

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Determine is_approved
    let isApproved = null;
    if (body.is_approved !== undefined) {
      isApproved = Boolean(body.is_approved);
    } else if (status === 'APPROVED') {
      isApproved = true;
    } else if (status === 'PENDING' || status === 'REJECTED') {
      isApproved = false;
    }

    if (isApproved === null && body.is_featured === undefined) {
      return NextResponse.json(
        { success: false, error: 'Status must be APPROVED, REJECTED, or PENDING' },
        { status: 400 }
      );
    }

    const isFeatured = body.is_featured !== undefined ? Boolean(body.is_featured) : null;

    const res = await queryDb(
      `UPDATE reviews
       SET is_approved = COALESCE($1, is_approved),
           is_featured = COALESCE($2, is_featured),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, creator_id, website_id, reviewer_name, institution_name, rating, title, review_text, review_text AS comment, is_featured, is_approved, CASE WHEN is_approved = TRUE THEN 'APPROVED' ELSE 'PENDING' END AS status, created_at, updated_at`,
      [isApproved, isFeatured, reviewId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    const updatedRow = res.rows[0];
    const newStatus = updatedRow.is_approved ? 'APPROVED' : 'PENDING';

    return NextResponse.json({
      success: true,
      message: `Review #${reviewId} has been successfully updated to ${newStatus}.`,
      review: updatedRow,
      record: updatedRow,
    });
  } catch (error) {
    console.error('Error in PUT /api/developer/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to moderate review' },
      { status: 500 }
    );
  }
}

// DELETE: Remove review
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'reviews');
    if (!auth.success) {
      return NextResponse.json(
        {
          success: false,
          error: auth.message || 'Access denied: Permission reviews required to delete reviews.',
        },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('reviewId');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.reviewId || body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const res = await queryDb('DELETE FROM reviews WHERE id = $1 RETURNING id', [Number(id)]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review permanently removed.',
      deleted: res.rows[0],
    });
  } catch (error) {
    console.error('Error in DELETE /api/developer/reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}

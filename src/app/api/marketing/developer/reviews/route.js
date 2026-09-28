import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

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
      SELECT r.*,
             c.name AS creator_name,
             c.email AS creator_email,
             NULL::text AS creator_avatar,
             p.name AS package_name,
             p.slug AS package_slug,
             d.name AS approved_by_name,
             COALESCE(dr.slug, 'developer') AS approved_by_role
      FROM reviews r
      JOIN creators c ON r.creator_id = c.id
      JOIN subscription s ON r.subscription_id = s.id
      JOIN packages p ON s.package_id = p.id
      LEFT JOIN developers d ON r.approved_by_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
    `;

    const params = [];
    if (statusParam && statusParam !== 'ALL') {
      params.push(statusParam.toUpperCase());
      queryText += ' WHERE r.status = $1';
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

// PUT: Moderate review status
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

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be APPROVED, REJECTED, or PENDING' },
        { status: 400 }
      );
    }

    const reviewerDeveloperId = auth.staff.id;

    const res = await queryDb(
      `UPDATE reviews
       SET status = $1,
           approved_by_developer_id = $2,
           approved_at = CASE WHEN $1 IN ('APPROVED', 'REJECTED') THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, reviewerDeveloperId, reviewId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Review #${reviewId} has been successfully updated to ${status}.`,
      review: res.rows[0],
      record: res.rows[0],
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

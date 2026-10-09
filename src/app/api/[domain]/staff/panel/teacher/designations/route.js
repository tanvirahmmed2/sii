import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';

// GET: List all designations for the website with teacher count
export async function GET(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const res = await queryDb(
      `SELECT wd.id, wd.website_id, wd.title, wd.description, wd.display_order, wd.is_active, wd.created_at, wd.updated_at,
              COUNT(wt.id)::int AS teacher_count
       FROM website_designations wd
       LEFT JOIN website_teachers wt ON wt.designation_id = wd.id AND wt.website_id = wd.website_id
       WHERE wd.website_id = $1
       GROUP BY wd.id
       ORDER BY wd.display_order ASC, wd.id ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      designations: res.rows,
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Error fetching designations:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch designations.' }, { status: 500 });
  }
}

// POST: Create a new designation
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const { title, description = '', display_order = 0, is_active = true } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Designation title is required.' }, { status: 400 });
    }

    const trimmedTitle = title.trim();

    // Check if duplicate title exists in this website
    const existing = await queryDb(
      `SELECT id FROM website_designations WHERE website_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
      [website.id, trimmedTitle]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A designation with this title already exists.' }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_designations (website_id, title, description, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [website.id, trimmedTitle, description?.trim() || null, Number(display_order) || 0, Boolean(is_active)]
    );

    return NextResponse.json({
      success: true,
      designation: insertRes.rows[0],
      message: 'Designation created successfully.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating designation:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create designation.' }, { status: 500 });
  }
}

// PUT: Update an existing designation
export async function PUT(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const { id, title, description, display_order, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Designation ID is required.' }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Designation title cannot be blank.' }, { status: 400 });
    }

    const trimmedTitle = title.trim();

    // Check uniqueness conflict with other designations in the same website
    const conflict = await queryDb(
      `SELECT id FROM website_designations WHERE website_id = $1 AND LOWER(title) = LOWER($2) AND id != $3 LIMIT 1`,
      [website.id, trimmedTitle, id]
    );

    if (conflict.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Another designation with this title already exists.' }, { status: 409 });
    }

    const updateRes = await queryDb(
      `UPDATE website_designations
       SET title = $1,
           description = $2,
           display_order = $3,
           is_active = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`,
      [trimmedTitle, description?.trim() || null, Number(display_order) || 0, Boolean(is_active), id, website.id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Designation not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      designation: updateRes.rows[0],
      message: 'Designation updated successfully.',
    });
  } catch (error) {
    console.error('Error updating designation:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update designation.' }, { status: 500 });
  }
}

// DELETE: Remove a designation
export async function DELETE(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Designation ID parameter is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_designations WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Designation not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Designation "${delRes.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting designation:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete designation.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: List all milestones for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT * FROM website_milestons 
      WHERE website_id = $1
    `;
    const params = [auth.website.id];

    if (status === 'active') {
      params.push(true);
      query += ` AND is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      query += ` AND is_active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR year ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY order_no ASC, year ASC, id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      milestones: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new milestone
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { year, title, description, image, image_id, order_no = 0, is_active = true } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Milestone title is required.' }, { status: 400 });
    }
    if (!description || !String(description).trim()) {
      return NextResponse.json({ success: false, error: 'Milestone description is required.' }, { status: 400 });
    }

    const finalYear = String(year || new Date().getFullYear()).trim();
    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    const insertResult = await queryDb(
      `INSERT INTO website_milestons (
        website_id, year, title, description, image, image_id, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        auth.website.id,
        finalYear,
        String(title).trim(),
        String(description).trim(),
        image ? String(image).trim() : null,
        image_id ? String(image_id).trim() : null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Milestone created successfully.',
      milestone: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing milestone
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, year, title, description, image, image_id, order_no, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Milestone ID is required for update.' }, { status: 400 });
    }

    const updateResult = await queryDb(
      `UPDATE website_milestons
       SET year = COALESCE($1, year),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           image = COALESCE($4, image),
           image_id = COALESCE($5, image_id),
           order_no = COALESCE($6, order_no),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND website_id = $9
       RETURNING *`,
      [
        year !== undefined ? String(year).trim() : null,
        title !== undefined ? String(title).trim() : null,
        description !== undefined ? String(description).trim() : null,
        image !== undefined ? (image ? String(image).trim() : null) : null,
        image_id !== undefined ? (image_id ? String(image_id).trim() : null) : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Milestone not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone updated successfully.',
      milestone: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a milestone
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Milestone ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_milestons WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Milestone not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Milestone "${deleteResult.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

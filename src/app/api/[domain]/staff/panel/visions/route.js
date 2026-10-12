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

// GET: List all visions for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT * FROM website_visions 
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
      query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY order_no ASC, id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      visions: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching visions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new vision
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { title, description, order_no = 0, icon, is_active = true } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Vision title is required.' }, { status: 400 });
    }
    if (!description || !String(description).trim()) {
      return NextResponse.json({ success: false, error: 'Vision description content is required.' }, { status: 400 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    const insertResult = await queryDb(
      `INSERT INTO website_visions (
        website_id, title, description, order_no, icon, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        auth.website.id,
        String(title).trim(),
        String(description).trim(),
        parseInt(order_no, 10) || 0,
        icon ? String(icon).trim() : null,
        Boolean(is_active),
        staffId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Vision statement created successfully.',
      vision: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error creating vision:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing vision
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, title, description, order_no, icon, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Vision ID is required for update.' }, { status: 400 });
    }

    const updateResult = await queryDb(
      `UPDATE website_visions
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           order_no = COALESCE($3, order_no),
           icon = COALESCE($4, icon),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7
       RETURNING *`,
      [
        title !== undefined ? String(title).trim() : null,
        description !== undefined ? String(description).trim() : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        icon !== undefined ? icon : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Vision statement not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Vision statement updated successfully.',
      vision: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating vision:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a vision
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Vision ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_visions WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Vision statement not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Vision statement "${deleteResult.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting vision:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

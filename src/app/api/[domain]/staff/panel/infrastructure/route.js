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

// GET: List all infrastructure facilities for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const facilityType = searchParams.get('facility_type')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT * FROM website_insfrastructure 
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

    if (facilityType && facilityType !== 'all') {
      params.push(facilityType);
      query += ` AND facility_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR subtitle ILIKE $${params.length} OR description ILIKE $${params.length} OR facility_type ILIKE $${params.length})`;
    }

    query += ` ORDER BY order_no ASC, id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      infrastructure: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching infrastructure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new infrastructure facility
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const {
      title,
      subtitle,
      description,
      facility_type = 'Campus Facility',
      image,
      image_id,
      order_no = 0,
      is_active = true,
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Facility title is required.' }, { status: 400 });
    }
    if (!description || !String(description).trim()) {
      return NextResponse.json({ success: false, error: 'Facility description is required.' }, { status: 400 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    const insertResult = await queryDb(
      `INSERT INTO website_insfrastructure (
        website_id, title, subtitle, description, facility_type, image, image_id, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        auth.website.id,
        String(title).trim(),
        subtitle ? String(subtitle).trim() : null,
        String(description).trim(),
        String(facility_type).trim(),
        image ? String(image).trim() : null,
        image_id ? String(image_id).trim() : null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Infrastructure facility created successfully.',
      facility: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error creating infrastructure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing infrastructure facility
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const {
      id,
      title,
      subtitle,
      description,
      facility_type,
      image,
      image_id,
      order_no,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Facility ID is required for update.' }, { status: 400 });
    }

    const updateResult = await queryDb(
      `UPDATE website_insfrastructure
       SET title = COALESCE($1, title),
           subtitle = COALESCE($2, subtitle),
           description = COALESCE($3, description),
           facility_type = COALESCE($4, facility_type),
           image = COALESCE($5, image),
           image_id = COALESCE($6, image_id),
           order_no = COALESCE($7, order_no),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND website_id = $10
       RETURNING *`,
      [
        title !== undefined ? String(title).trim() : null,
        subtitle !== undefined ? (subtitle ? String(subtitle).trim() : null) : null,
        description !== undefined ? String(description).trim() : null,
        facility_type !== undefined ? String(facility_type).trim() : null,
        image !== undefined ? (image ? String(image).trim() : null) : null,
        image_id !== undefined ? (image_id ? String(image_id).trim() : null) : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Infrastructure facility not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Infrastructure facility updated successfully.',
      facility: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating infrastructure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete an infrastructure facility
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Facility ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_insfrastructure WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Facility not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Facility "${deleteResult.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting infrastructure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

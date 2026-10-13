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

// GET: List all departments for this website (First step in academic hierarchy)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT d.*,
             COALESCE((SELECT COUNT(*) FROM website_classes c WHERE c.department_id = d.id), 0)::int AS class_count,
             EXISTS(SELECT 1 FROM website_department_information di WHERE di.department_id = d.id) AS has_information
      FROM website_departments d
      WHERE d.website_id = $1
    `;
    const params = [auth.website.id];

    if (status === 'active') {
      params.push(true);
      query += ` AND d.is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      query += ` AND d.is_active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (d.name ILIKE $${params.length} OR d.code ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY d.order_no ASC, d.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      departments: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new department
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      code,
      description = '',
      order_no = 0,
      is_active = true,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Department name is required (e.g. Science, Business Studies).' }, { status: 400 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    const insertResult = await queryDb(
      `INSERT INTO website_departments (
        website_id, name, code, description, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        auth.website.id,
        String(name).trim(),
        code ? String(code).trim().toUpperCase() : null,
        description ? String(description).trim() : null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    const savedDept = insertResult.rows[0];

    const enrichedResult = await queryDb(
      `SELECT d.*,
              0::int AS session_count,
              0::int AS class_count,
              FALSE AS has_information
       FROM website_departments d
       WHERE d.id = $1`,
      [savedDept.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Department created successfully.',
      department: enrichedResult.rows[0] || savedDept,
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing department
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      name,
      code,
      description,
      order_no,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Department ID is required for update.' }, { status: 400 });
    }

    const checkResult = await queryDb(
      `SELECT id FROM website_departments WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    if (checkResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Department not found.' }, { status: 404 });
    }

    await queryDb(
      `UPDATE website_departments
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           order_no = COALESCE($4, order_no),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7`,
      [
        name !== undefined ? (name ? String(name).trim() : null) : null,
        code !== undefined ? (code ? String(code).trim().toUpperCase() : null) : null,
        description !== undefined ? String(description).trim() : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    const updatedResult = await queryDb(
      `SELECT d.*,
              COALESCE((SELECT COUNT(*) FROM website_classes c WHERE c.department_id = d.id), 0)::int AS class_count,
              EXISTS(SELECT 1 FROM website_department_information di WHERE di.department_id = d.id) AS has_information
       FROM website_departments d
       WHERE d.id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully.',
      department: updatedResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a department
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Department ID is required.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_departments WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Department not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Department "${deleteResult.rows[0].name}" removed successfully.`,
      deleted_id: deleteResult.rows[0].id,
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

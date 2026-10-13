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

// GET: List or fetch department information profiles
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('department_id')?.trim();
    const id = searchParams.get('id')?.trim();

    // 1. Fetch available departments for selection & metadata
    const departmentsResult = await queryDb(
      `SELECT d.id, d.name, d.code, d.is_active,
              COALESCE((SELECT COUNT(*) FROM website_classes c WHERE c.department_id = d.id), 0)::int AS class_count
       FROM website_departments d
       WHERE d.website_id = $1
       ORDER BY d.order_no ASC, d.name ASC`,
      [auth.website.id]
    );

    // 2. Query department information profiles with department details
    let query = `
      SELECT di.*,
             d.name AS department_name,
             d.code AS department_code,
             ws.name AS created_by_staff_name
      FROM website_department_information di
      JOIN website_departments d ON d.id = di.department_id
      LEFT JOIN website_staffs ws ON ws.id = di.created_by_staff_id
      WHERE di.website_id = $1
    `;
    const params = [auth.website.id];

    if (id) {
      params.push(id);
      query += ` AND di.id = $${params.length}`;
    }

    if (departmentId) {
      params.push(departmentId);
      query += ` AND di.department_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        d.name ILIKE $${params.length} OR 
        d.code ILIKE $${params.length} OR 
        di.motto ILIKE $${params.length} OR 
        di.summary ILIKE $${params.length} OR 
        di.description ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY d.order_no ASC, d.name ASC, di.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      department_information: result.rows,
      available_departments: departmentsResult.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching department information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create or upsert department information
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      department_id,
      motto,
      summary,
      description,
      expected_cost,
    } = body;

    if (!department_id) {
      return NextResponse.json({ success: false, error: 'Please select a valid academic department.' }, { status: 400 });
    }

    // Verify department belongs to this website
    const deptCheck = await queryDb(
      `SELECT id, name, code FROM website_departments WHERE id = $1 AND website_id = $2`,
      [department_id, auth.website.id]
    );

    if (deptCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Selected department does not exist or does not belong to this institution.' }, { status: 404 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;
    const parsedCost = expected_cost !== undefined && expected_cost !== null && String(expected_cost).trim() !== ''
      ? Math.max(0, parseFloat(expected_cost) || 0)
      : 0.00;

    const upsertResult = await queryDb(
      `INSERT INTO website_department_information (
        website_id, department_id, motto, summary, description, expected_cost, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (website_id, department_id)
      DO UPDATE SET
        motto = EXCLUDED.motto,
        summary = EXCLUDED.summary,
        description = EXCLUDED.description,
        expected_cost = EXCLUDED.expected_cost,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        auth.website.id,
        parseInt(department_id, 10),
        motto ? String(motto).trim() : null,
        summary ? String(summary).trim() : null,
        description ? String(description).trim() : null,
        parsedCost,
        staffId,
      ]
    );

    const savedRow = upsertResult.rows[0];

    // Query joined record for full response
    const enrichedResult = await queryDb(
      `SELECT di.*,
              d.name AS department_name,
              d.code AS department_code,
              ws.name AS created_by_staff_name
       FROM website_department_information di
       JOIN website_departments d ON d.id = di.department_id
       LEFT JOIN website_staffs ws ON ws.id = di.created_by_staff_id
       WHERE di.id = $1 AND di.website_id = $2`,
      [savedRow.id, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Department information saved successfully.',
      department_info: enrichedResult.rows[0] || savedRow,
    });
  } catch (error) {
    console.error('Error saving department information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update existing department information
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      department_id,
      motto,
      summary,
      description,
      expected_cost,
    } = body;

    const targetId = id || department_id;
    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Record ID or Department ID is required for update.' }, { status: 400 });
    }

    // Verify record exists for website
    const existingResult = await queryDb(
      `SELECT id, department_id FROM website_department_information 
       WHERE (id = $1 OR department_id = $1) AND website_id = $2`,
      [targetId, auth.website.id]
    );

    if (existingResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Department information record not found.' }, { status: 404 });
    }

    const recordId = existingResult.rows[0].id;
    const parsedCost = expected_cost !== undefined && expected_cost !== null && String(expected_cost).trim() !== ''
      ? Math.max(0, parseFloat(expected_cost) || 0)
      : 0.00;

    await queryDb(
      `UPDATE website_department_information
       SET motto = $1,
           summary = $2,
           description = $3,
           expected_cost = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6`,
      [
        motto !== undefined ? (motto ? String(motto).trim() : null) : null,
        summary !== undefined ? (summary ? String(summary).trim() : null) : null,
        description !== undefined ? (description ? String(description).trim() : null) : null,
        parsedCost,
        recordId,
        auth.website.id,
      ]
    );

    const updatedResult = await queryDb(
      `SELECT di.*,
              d.name AS department_name,
              d.code AS department_code,
              ws.name AS created_by_staff_name
       FROM website_department_information di
       JOIN website_departments d ON d.id = di.department_id
       LEFT JOIN website_staffs ws ON ws.id = di.created_by_staff_id
       WHERE di.id = $1 AND di.website_id = $2`,
      [recordId, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Department information updated successfully.',
      department_info: updatedResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating department information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove department information record
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_department_information WHERE id = $1 AND website_id = $2 RETURNING id, department_id`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Department information record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Department information removed successfully.',
      deleted_id: deleteResult.rows[0].id,
    });
  } catch (error) {
    console.error('Error deleting department information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

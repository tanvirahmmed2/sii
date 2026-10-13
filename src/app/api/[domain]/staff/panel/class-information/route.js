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

// GET: List all class information records or single by id/class_id
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const classId = searchParams.get('class_id')?.trim();
    const id = searchParams.get('id')?.trim();

    // 1. Fetch available website classes
    const classesResult = await queryDb(
      `SELECT c.id, c.name, c.code, c.max_seats,
              COALESCE((SELECT COUNT(*) FROM website_sections s WHERE s.class_id = c.id), 0)::int AS section_count,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
       FROM website_classes c
       WHERE c.website_id = $1
       ORDER BY c.name ASC`,
      [auth.website.id]
    );

    // 2. Query class information joined with class metadata and staff author
    let query = `
      SELECT ci.*,
             c.name AS class_name,
             c.code AS class_code,
             c.max_seats,
             ws.name AS created_by_staff_name
      FROM website_class_information ci
      JOIN website_classes c ON c.id = ci.class_id
      LEFT JOIN website_staffs ws ON ws.id = ci.created_by_staff_id
      WHERE ci.website_id = $1
    `;
    const params = [auth.website.id];

    if (id) {
      params.push(id);
      query += ` AND ci.id = $${params.length}`;
    }

    if (classId) {
      params.push(classId);
      query += ` AND ci.class_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        c.name ILIKE $${params.length} OR 
        c.code ILIKE $${params.length} OR 
        ci.motto ILIKE $${params.length} OR 
        ci.summary ILIKE $${params.length} OR 
        ci.description ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY c.name ASC, ci.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      class_information: result.rows,
      available_classes: classesResult.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching class information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create or upsert class information
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      class_id,
      motto,
      summary,
      description,
      expected_cost,
    } = body;

    if (!class_id) {
      return NextResponse.json({ success: false, error: 'Please select a valid academic class.' }, { status: 400 });
    }

    // Verify class belongs to this website
    const classCheck = await queryDb(
      `SELECT id, name, code FROM website_classes WHERE id = $1 AND website_id = $2`,
      [class_id, auth.website.id]
    );

    if (classCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Selected class does not exist or does not belong to this institution.' }, { status: 404 });
    }

    const parsedCost = expected_cost !== undefined && expected_cost !== null && String(expected_cost).trim() !== ''
      ? Math.max(0, parseFloat(expected_cost) || 0)
      : 0.00;

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    const upsertResult = await queryDb(
      `INSERT INTO website_class_information (
        website_id, class_id, motto, summary, description, expected_cost, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (website_id, class_id) DO UPDATE SET
        motto = EXCLUDED.motto,
        summary = EXCLUDED.summary,
        description = EXCLUDED.description,
        expected_cost = EXCLUDED.expected_cost,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        auth.website.id,
        class_id,
        motto ? String(motto).trim() : null,
        summary ? String(summary).trim() : null,
        description ? String(description).trim() : null,
        parsedCost,
        staffId,
      ]
    );

    const savedRow = upsertResult.rows[0];

    // Query joined record for comprehensive response
    const enrichedResult = await queryDb(
      `SELECT ci.*,
              c.name AS class_name,
              c.code AS class_code,
              c.max_seats,
              ws.name AS created_by_staff_name
       FROM website_class_information ci
       JOIN website_classes c ON c.id = ci.class_id
       LEFT JOIN website_staffs ws ON ws.id = ci.created_by_staff_id
       WHERE ci.id = $1 AND ci.website_id = $2`,
      [savedRow.id, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Class information saved successfully.',
      class_info: enrichedResult.rows[0] || savedRow,
    });
  } catch (error) {
    console.error('Error saving class information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update existing class information
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      class_id,
      motto,
      summary,
      description,
      expected_cost,
    } = body;

    const targetId = id || class_id;
    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Record ID or Class ID is required for update.' }, { status: 400 });
    }

    // Verify record exists for website
    const existingResult = await queryDb(
      `SELECT id, class_id FROM website_class_information 
       WHERE (id = $1 OR class_id = $1) AND website_id = $2`,
      [targetId, auth.website.id]
    );

    if (existingResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Class information record not found.' }, { status: 404 });
    }

    const recordId = existingResult.rows[0].id;
    const parsedCost = expected_cost !== undefined && expected_cost !== null && String(expected_cost).trim() !== ''
      ? Math.max(0, parseFloat(expected_cost) || 0)
      : 0.00;

    await queryDb(
      `UPDATE website_class_information
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

    // Retrieve updated joined record
    const updatedResult = await queryDb(
      `SELECT ci.*,
              c.name AS class_name,
              c.code AS class_code,
              c.max_seats,
              ws.name AS created_by_staff_name
       FROM website_class_information ci
       JOIN website_classes c ON c.id = ci.class_id
       LEFT JOIN website_staffs ws ON ws.id = ci.created_by_staff_id
       WHERE ci.id = $1 AND ci.website_id = $2`,
      [recordId, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Class information updated successfully.',
      class_info: updatedResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating class information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove class information record
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id || body?.class_id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID or Class ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_class_information 
       WHERE (id = $1 OR class_id = $1) AND website_id = $2
       RETURNING id, class_id`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Class information record not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Class information deleted successfully.',
      deleted_id: deleteResult.rows[0].id,
    });
  } catch (error) {
    console.error('Error deleting class information:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

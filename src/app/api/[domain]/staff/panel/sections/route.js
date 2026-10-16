import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession } from 'src/lib/middleware/staff';

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

// GET: List sections (under Classes and Departments)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');

    // 1. Fetch available classes with parent department info
    const classesResult = await queryDb(
      `SELECT c.id, c.name, c.code,
              dept.name AS department_name
       FROM website_classes c
       LEFT JOIN website_departments dept ON dept.id = c.department_id
       WHERE c.website_id = $1
       ORDER BY c.name ASC`,
      [auth.website.id]
    );

    // 2. Query sections with class and department details
    let queryText = `
      SELECT s.*, 
             c.name AS class_name, 
             c.code AS class_code,
             dept.name AS department_name
      FROM website_sections s
      JOIN website_classes c ON c.id = s.class_id
      LEFT JOIN website_departments dept ON dept.id = c.department_id
      WHERE s.website_id = $1
    `;
    const params = [auth.website.id];

    if (classId && classId !== 'all') {
      params.push(classId);
      queryText += ` AND s.class_id = $${params.length}`;
    }

    queryText += ` ORDER BY c.name ASC, s.name ASC`;

    const result = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      sections: result.rows,
      available_classes: classesResult.rows,
      payload: { sections: result.rows, available_classes: classesResult.rows }
    });
  } catch (error) {
    console.error('Error in GET sections:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create section
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { class_id, name, capacity = 40, room_number = '' } = body;

    if (!class_id) {
      return NextResponse.json({ success: false, error: 'Target Class is required.' }, { status: 400 });
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Section Name is required (e.g. Section A, Batch 1).' }, { status: 400 });
    }

    // Verify class belongs to website
    const classCheck = await queryDb(
      `SELECT id FROM website_classes WHERE id = $1 AND website_id = $2`,
      [class_id, auth.website.id]
    );
    if (classCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Target class does not exist.' }, { status: 400 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_sections (website_id, class_id, name, capacity, room_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        auth.website.id,
        parseInt(class_id, 10),
        String(name).trim(),
        parseInt(capacity, 10) || 40,
        room_number ? String(room_number).trim() : null
      ]
    );

    const savedSection = insertRes.rows[0];

    const enrichedRes = await queryDb(
      `SELECT s.*, 
              c.name AS class_name, 
              c.code AS class_code,
              dept.name AS department_name
       FROM website_sections s
       JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_departments dept ON dept.id = c.department_id
       WHERE s.id = $1`,
      [savedSection.id]
    );

    return NextResponse.json({
      success: true,
      section: enrichedRes.rows[0] || savedSection,
      message: 'Section created successfully.'
    });
  } catch (error) {
    console.error('Error in POST section:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A section with this name already exists in this class.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update section
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, class_id, name, capacity, room_number } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Section ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_sections
       SET class_id = COALESCE($1, class_id),
           name = COALESCE($2, name),
           capacity = COALESCE($3, capacity),
           room_number = COALESCE($4, room_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`,
      [
        class_id ? parseInt(class_id, 10) : null,
        name ? String(name).trim() : null,
        capacity !== undefined ? parseInt(capacity, 10) : null,
        room_number !== undefined ? (room_number ? String(room_number).trim() : null) : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Section not found.' }, { status: 404 });
    }

    const enrichedRes = await queryDb(
      `SELECT s.*, 
              c.name AS class_name, 
              c.code AS class_code,
              dept.name AS department_name
       FROM website_sections s
       JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_departments dept ON dept.id = c.department_id
       WHERE s.id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      section: enrichedRes.rows[0] || updateRes.rows[0],
      message: 'Section updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT section:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete section
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Section ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_sections WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Section not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Section "${delRes.rows[0].name}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error in DELETE section:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

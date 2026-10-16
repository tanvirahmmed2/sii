import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff';

async function verifyStaffAccess(request, context, action = 'view') {
  return verifyStaffModuleAccess(request, context, 'routine', action);
}

// GET: List all classes strictly under Academic Departments
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'view');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');

    // Fetch available departments for this website
    const departmentsResult = await queryDb(
      `SELECT id, name, code, slug 
       FROM website_departments 
       WHERE website_id = $1 
       ORDER BY order_no ASC, name ASC`,
      [auth.website.id]
    );

    let query = `
      SELECT c.*,
             d.name AS department_name,
             d.code AS department_code,
             d.slug AS department_slug,
             COALESCE((SELECT COUNT(*) FROM website_sections sec WHERE sec.class_id = c.id), 0)::int AS section_count,
             COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
      FROM website_classes c
      JOIN website_departments d ON d.id = c.department_id AND d.website_id = c.website_id
      WHERE c.website_id = $1
    `;
    const params = [auth.website.id];

    if (departmentId && departmentId !== 'all') {
      params.push(departmentId);
      query += ` AND c.department_id = $${params.length}`;
    }

    query += ` ORDER BY d.name ASC, c.name ASC, c.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      classes: result.rows,
      available_departments: departmentsResult.rows,
      departments: departmentsResult.rows,
      payload: {
        classes: result.rows,
        available_departments: departmentsResult.rows
      }
    });
  } catch (error) {
    console.error('Error in GET classes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create class (Only department_id is required; no session)
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'create');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const {
      name,
      code,
      department_id,
      max_seats = 40,
      description = ''
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Class name is required (e.g., Class 1, Grade 10).' }, { status: 400 });
    }

    // Department is strictly REQUIRED
    if (!department_id) {
      return NextResponse.json({ success: false, error: 'Department is required to create a class.' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const cleanCodePart = trimmedName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    const trimmedCode = code ? String(code).trim().toUpperCase() : `CLS-${cleanCodePart || '1'}`;

    // Verify department belongs to this website
    const deptCheck = await queryDb(
      `SELECT id, name FROM website_departments WHERE id = $1 AND website_id = $2`,
      [department_id, auth.website.id]
    );
    if (deptCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Selected department does not exist.' }, { status: 400 });
    }
    const validDeptId = parseInt(department_id, 10);

    const insertRes = await queryDb(
      `INSERT INTO website_classes (website_id, department_id, name, code, max_seats, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.website.id,
        validDeptId,
        trimmedName,
        trimmedCode,
        parseInt(max_seats, 10) || 40,
        description ? String(description).trim() : null
      ]
    );

    const savedClass = insertRes.rows[0];

    const enrichedRes = await queryDb(
      `SELECT c.*,
              d.name AS department_name,
              d.code AS department_code,
              d.slug AS department_slug,
              0::int AS section_count,
              0::int AS subject_count
       FROM website_classes c
       JOIN website_departments d ON d.id = c.department_id
       WHERE c.id = $1`,
      [savedClass.id]
    );

    return NextResponse.json({
      success: true,
      classItem: enrichedRes.rows[0] || savedClass,
      class: enrichedRes.rows[0] || savedClass,
      message: 'Class created successfully.'
    });
  } catch (error) {
    console.error('Error in POST class:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A class with this name or code already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update class (Only department_id is required; no session)
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'edit');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const {
      id,
      name,
      code,
      department_id,
      max_seats,
      description
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 });
    }

    // Verify class exists and belongs to this website
    const existingCheck = await queryDb(
      `SELECT * FROM website_classes WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    if (existingCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 });
    }
    const existing = existingCheck.rows[0];

    // If department_id is being updated, it must be provided and valid
    let targetDeptId = existing.department_id;
    if (department_id !== undefined) {
      if (!department_id) {
        return NextResponse.json({ success: false, error: 'Department is required for a class.' }, { status: 400 });
      }
      const deptCheck = await queryDb(
        `SELECT id FROM website_departments WHERE id = $1 AND website_id = $2`,
        [department_id, auth.website.id]
      );
      if (deptCheck.rowCount === 0) {
        return NextResponse.json({ success: false, error: 'Selected department does not exist.' }, { status: 400 });
      }
      targetDeptId = parseInt(department_id, 10);
    }

    const updatedName = name !== undefined ? (name ? String(name).trim() : existing.name) : existing.name;
    const updatedCode = code !== undefined ? (code ? String(code).trim().toUpperCase() : existing.code) : existing.code;
    const updatedMaxSeats = max_seats !== undefined ? (parseInt(max_seats, 10) || existing.max_seats) : existing.max_seats;
    const updatedDesc = description !== undefined ? (description ? String(description).trim() : null) : existing.description;

    const updateRes = await queryDb(
      `UPDATE website_classes
       SET name = $1,
           code = $2,
           department_id = $3,
           max_seats = $4,
           description = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7
       RETURNING *`,
      [
        updatedName,
        updatedCode,
        targetDeptId,
        updatedMaxSeats,
        updatedDesc,
        id,
        auth.website.id
      ]
    );

    const enrichedRes = await queryDb(
      `SELECT c.*,
              d.name AS department_name,
              d.code AS department_code,
              d.slug AS department_slug,
              COALESCE((SELECT COUNT(*) FROM website_sections sec WHERE sec.class_id = c.id), 0)::int AS section_count,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
       FROM website_classes c
       JOIN website_departments d ON d.id = c.department_id
       WHERE c.id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      classItem: enrichedRes.rows[0] || updateRes.rows[0],
      class: enrichedRes.rows[0] || updateRes.rows[0],
      message: 'Class updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT class:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A class with this name or code already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete class
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'delete');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_classes WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Class "${delRes.rows[0].name}" deleted successfully.`,
      deleted_id: delRes.rows[0].id
    });
  } catch (error) {
    console.error('Error in DELETE class:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

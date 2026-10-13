import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
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

// GET: List all classes (Step 3 in hierarchy: under Sessions & Departments)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const sessionId = searchParams.get('session_id');

    // Fetch available departments & sessions
    const [departmentsResult, sessionsResult] = await Promise.all([
      queryDb(
        `SELECT id, name, code 
         FROM website_departments 
         WHERE website_id = $1 
         ORDER BY order_no ASC, name ASC`,
        [auth.website.id]
      ),
      queryDb(
        `SELECT id, name, is_current 
         FROM website_sessions 
         WHERE website_id = $1 
         ORDER BY is_current DESC, name DESC`,
        [auth.website.id]
      )
    ]);

    let query = `
      SELECT c.*,
             s.name AS session_name,
             d.name AS department_name,
             d.code AS department_code,
             COALESCE((SELECT COUNT(*) FROM website_sections sec WHERE sec.class_id = c.id), 0)::int AS section_count,
             COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
      FROM website_classes c
      LEFT JOIN website_sessions s ON s.id = c.session_id
      LEFT JOIN website_departments d ON d.id = c.department_id
      WHERE c.website_id = $1
    `;
    const params = [auth.website.id];

    if (departmentId && departmentId !== 'all') {
      params.push(departmentId);
      query += ` AND c.department_id = $${params.length}`;
    }

    if (sessionId && sessionId !== 'all') {
      params.push(sessionId);
      query += ` AND c.session_id = $${params.length}`;
    }

    query += ` ORDER BY c.name ASC, c.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      classes: result.rows,
      available_departments: departmentsResult.rows,
      available_sessions: sessionsResult.rows,
      payload: {
        classes: result.rows,
        available_departments: departmentsResult.rows,
        available_sessions: sessionsResult.rows
      }
    });
  } catch (error) {
    console.error('Error in GET classes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create class
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const {
      name,
      code,
      session_id,
      department_id,
      max_seats = 40,
      description = ''
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Class name is required (e.g., Class 1, Grade 10).' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const cleanCodePart = trimmedName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    const trimmedCode = code ? String(code).trim().toUpperCase() : `CLS-${cleanCodePart || '1'}`;

    if (!department_id) {
      return NextResponse.json({ success: false, error: 'Department is required to create a class.' }, { status: 400 });
    }
    if (!session_id) {
      return NextResponse.json({ success: false, error: 'Academic session is required to create a class.' }, { status: 400 });
    }

    // Verify department belongs to this website
    const deptCheck = await queryDb(
      `SELECT id FROM website_departments WHERE id = $1 AND website_id = $2`,
      [department_id, auth.website.id]
    );
    if (deptCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Selected department does not exist.' }, { status: 400 });
    }
    const validDeptId = parseInt(department_id, 10);

    // Verify session belongs to this website
    const sessionCheck = await queryDb(
      `SELECT id FROM website_sessions WHERE id = $1 AND website_id = $2`,
      [session_id, auth.website.id]
    );
    if (sessionCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Selected academic session does not exist.' }, { status: 400 });
    }
    const validSessionId = parseInt(session_id, 10);

    const insertRes = await queryDb(
      `INSERT INTO website_classes (website_id, session_id, department_id, name, code, max_seats, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        auth.website.id,
        validSessionId,
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
              s.name AS session_name,
              d.name AS department_name,
              d.code AS department_code,
              0::int AS section_count,
              0::int AS subject_count
       FROM website_classes c
       LEFT JOIN website_sessions s ON s.id = c.session_id
       LEFT JOIN website_departments d ON d.id = c.department_id
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

// PUT: Update class
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const {
      id,
      name,
      code,
      session_id,
      department_id,
      max_seats,
      description
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_classes
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           session_id = CASE WHEN $3::boolean THEN $4::bigint ELSE session_id END,
           department_id = CASE WHEN $5::boolean THEN $6::bigint ELSE department_id END,
           max_seats = COALESCE($7, max_seats),
           description = COALESCE($8, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND website_id = $10
       RETURNING *`,
      [
        name !== undefined ? (name ? String(name).trim() : null) : null,
        code !== undefined ? (code ? String(code).trim().toUpperCase() : null) : null,
        session_id !== undefined,
        session_id ? parseInt(session_id, 10) : null,
        department_id !== undefined,
        department_id ? parseInt(department_id, 10) : null,
        max_seats !== undefined ? parseInt(max_seats, 10) : null,
        description !== undefined ? String(description).trim() : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 });
    }

    const enrichedRes = await queryDb(
      `SELECT c.*,
              s.name AS session_name,
              d.name AS department_name,
              d.code AS department_code,
              COALESCE((SELECT COUNT(*) FROM website_sections sec WHERE sec.class_id = c.id), 0)::int AS section_count,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
       FROM website_classes c
       LEFT JOIN website_sessions s ON s.id = c.session_id
       LEFT JOIN website_departments d ON d.id = c.department_id
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
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_classes WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE class:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

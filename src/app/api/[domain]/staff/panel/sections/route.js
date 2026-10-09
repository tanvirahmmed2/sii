import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  if (!devAdmin && staffSession && String(staffSession.website_id) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession, devAdmin };
}

// GET: List sections (optionally filter by class_id)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');

    let queryText = `
      SELECT s.*, 
             c.name AS class_name, 
             c.numeric_name AS class_numeric,
             c.code AS class_code
      FROM website_sections s
      JOIN website_classes c ON c.id = s.class_id
      WHERE s.website_id = $1
    `;
    const params = [auth.website.id];

    if (classId) {
      params.push(classId);
      queryText += ` AND s.class_id = $2`;
    }

    queryText += ` ORDER BY c.numeric_name ASC, s.name ASC`;

    const result = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      sections: result.rows,
      payload: { sections: result.rows }
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
      return NextResponse.json({ success: false, error: 'Section name is required (e.g., Section A, Morning).' }, { status: 400 });
    }

    // Verify class belongs to website
    const classCheck = await queryDb(
      `SELECT id, name FROM website_classes WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [class_id, auth.website.id]
    );

    if (classCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected class does not exist in this portal.' }, { status: 404 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_sections (website_id, class_id, name, capacity, room_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        auth.website.id,
        class_id,
        String(name).trim(),
        parseInt(capacity, 10) || 40,
        room_number ? String(room_number).trim() : null
      ]
    );

    return NextResponse.json({
      success: true,
      section: insertRes.rows[0],
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
        class_id !== undefined ? class_id : null,
        name !== undefined ? String(name).trim() : null,
        capacity !== undefined ? parseInt(capacity, 10) : null,
        room_number !== undefined ? String(room_number).trim() : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Section not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      section: updateRes.rows[0],
      message: 'Section updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT section:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Another section in this class already uses this name.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove section
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Section ID query parameter required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_sections WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Section not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE section:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

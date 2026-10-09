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

// GET: List all classes with section & subject counts
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const result = await queryDb(
      `SELECT c.*,
              COALESCE((SELECT COUNT(*) FROM website_sections s WHERE s.class_id = c.id), 0)::int AS section_count,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
       FROM website_classes c
       WHERE c.website_id = $1
       ORDER BY c.numeric_name ASC, c.name ASC`,
      [auth.website.id]
    );

    return NextResponse.json({
      success: true,
      classes: result.rows,
      payload: { classes: result.rows }
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
    const { name, numeric_name, code, max_seats = 40, description = '' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Class name is required (e.g., Class 1, Grade 10).' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const numVal = parseInt(numeric_name, 10);
    const parsedNum = isNaN(numVal) ? 1 : numVal;
    const trimmedCode = code ? String(code).trim() : `CLS-${parsedNum}`;

    const insertRes = await queryDb(
      `INSERT INTO website_classes (website_id, name, numeric_name, code, max_seats, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.website.id,
        trimmedName,
        parsedNum,
        trimmedCode,
        parseInt(max_seats, 10) || 40,
        description ? String(description).trim() : null
      ]
    );

    return NextResponse.json({
      success: true,
      classItem: insertRes.rows[0],
      class: insertRes.rows[0],
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
    const { id, name, numeric_name, code, max_seats, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_classes
       SET name = COALESCE($1, name),
           numeric_name = COALESCE($2, numeric_name),
           code = COALESCE($3, code),
           max_seats = COALESCE($4, max_seats),
           description = COALESCE($5, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7
       RETURNING *`,
      [
        name !== undefined ? String(name).trim() : null,
        numeric_name !== undefined ? parseInt(numeric_name, 10) : null,
        code !== undefined ? String(code).trim() : null,
        max_seats !== undefined ? parseInt(max_seats, 10) : null,
        description !== undefined ? String(description).trim() : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      classItem: updateRes.rows[0],
      class: updateRes.rows[0],
      message: 'Class updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT class:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Another class already uses this name or code.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove class
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Class ID query parameter required.' }, { status: 400 });
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
      message: 'Class and its sections/subjects deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE class:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

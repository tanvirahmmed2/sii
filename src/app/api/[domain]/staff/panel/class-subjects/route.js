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

// GET: List class subjects (optionally filter by class_id)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');

    let queryText = `
      SELECT cs.*,
             c.name AS class_name,
             c.numeric_name AS class_numeric,
             s.name AS subject_name,
             s.code AS subject_code,
             s.type AS subject_type
      FROM website_class_subjects cs
      JOIN website_classes c ON c.id = cs.class_id
      JOIN website_subjects s ON s.id = cs.subject_id
      WHERE cs.website_id = $1
    `;
    const params = [auth.website.id];

    if (classId) {
      params.push(classId);
      queryText += ` AND cs.class_id = $2`;
    }

    queryText += ` ORDER BY c.numeric_name ASC, s.name ASC`;

    const result = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      classSubjects: result.rows,
      payload: { classSubjects: result.rows }
    });
  } catch (error) {
    console.error('Error in GET class-subjects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Assign subject to class
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { class_id, subject_id, full_marks = 100, pass_marks = 33, is_optional = false } = body;

    if (!class_id || !subject_id) {
      return NextResponse.json({ success: false, error: 'Both Class and Subject are required.' }, { status: 400 });
    }

    // Verify class and subject belong to tenant
    const verifyClass = await queryDb(
      `SELECT id FROM website_classes WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [class_id, auth.website.id]
    );
    const verifySubject = await queryDb(
      `SELECT id FROM website_subjects WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [subject_id, auth.website.id]
    );

    if (verifyClass.rows.length === 0 || verifySubject.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Class or Subject does not exist in this portal.' }, { status: 404 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_class_subjects (website_id, class_id, subject_id, full_marks, pass_marks, is_optional)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.website.id,
        class_id,
        subject_id,
        parseFloat(full_marks) || 100,
        parseFloat(pass_marks) || 33,
        Boolean(is_optional)
      ]
    );

    return NextResponse.json({
      success: true,
      classSubject: insertRes.rows[0],
      message: 'Subject assigned to class successfully.'
    });
  } catch (error) {
    console.error('Error in POST class-subject:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'This subject is already assigned to this class.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update class subject marks or optional status
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, full_marks, pass_marks, is_optional } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Class-Subject mapping ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_class_subjects
       SET full_marks = COALESCE($1, full_marks),
           pass_marks = COALESCE($2, pass_marks),
           is_optional = COALESCE($3, is_optional),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND website_id = $5
       RETURNING *`,
      [
        full_marks !== undefined ? parseFloat(full_marks) : null,
        pass_marks !== undefined ? parseFloat(pass_marks) : null,
        is_optional !== undefined ? Boolean(is_optional) : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Mapping not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      classSubject: updateRes.rows[0],
      message: 'Class subject updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT class-subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Unassign subject from class
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Mapping ID query parameter required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_class_subjects WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Mapping not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subject removed from class successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE class-subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

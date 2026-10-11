import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyStaffClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

// GET: List all classrooms for this tenant website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffClassroomAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const sessionId = searchParams.get('session_id');

    let whereClause = `WHERE c.website_id = $1`;
    const params = [auth.website.id];

    if (classId) {
      params.push(classId);
      whereClause += ` AND c.class_id = $${params.length}`;
    }

    if (sessionId) {
      params.push(sessionId);
      whereClause += ` AND c.session_id = $${params.length}`;
    }

    const sql = `
      SELECT c.*,
             cls.name AS class_name,
             cls.numeric_name AS class_numeric_name,
             sess.name AS session_name,
             (SELECT COUNT(*) FROM website_classroom_syllabus s WHERE s.classroom_id = c.id)::int AS syllabus_count,
             (SELECT COUNT(*) FROM website_classroom_assignments a WHERE a.classroom_id = c.id)::int AS assignment_count,
             (SELECT COUNT(*) FROM website_classroom_lectures l WHERE l.classroom_id = c.id)::int AS lecture_count,
             (SELECT COUNT(*) FROM website_classroom_notes n WHERE n.classroom_id = c.id)::int AS notes_count
      FROM website_classrooms c
      LEFT JOIN website_classes cls ON cls.id = c.class_id
      LEFT JOIN website_sessions sess ON sess.id = c.session_id
      ${whereClause}
      ORDER BY cls.numeric_name ASC, c.name ASC
    `;

    const res = await query(sql, params);

    return NextResponse.json({
      success: true,
      classrooms: res.rows
    });
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new classroom
export async function POST(request, context) {
  try {
    const auth = await verifyStaffClassroomAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { class_id, session_id, name, room_number, description, is_active = true } = body;

    if (!class_id || !session_id || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Class, Session, and Classroom Name are required.' },
        { status: 400 }
      );
    }

    // Check if classroom already exists for this class and session
    const existing = await query(
      `SELECT id FROM website_classrooms 
       WHERE website_id = $1 AND class_id = $2 AND session_id = $3 LIMIT 1`,
      [auth.website.id, class_id, session_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A classroom for this Class and Session already exists.' },
        { status: 409 }
      );
    }

    const staffId = auth.actor?.type === 'staff' ? auth.actor.id : null;

    const insertRes = await query(
      `INSERT INTO website_classrooms 
       (website_id, class_id, session_id, name, room_number, description, is_active, created_by_staff_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        auth.website.id,
        class_id,
        session_id,
        name.trim(),
        room_number?.trim() || null,
        description?.trim() || null,
        Boolean(is_active),
        staffId
      ]
    );

    return NextResponse.json({
      success: true,
      classroom: insertRes.rows[0],
      message: 'Classroom created successfully.'
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update classroom
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffClassroomAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { id, name, room_number, description, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Classroom ID is required.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE website_classrooms
       SET name = COALESCE($1, name),
           room_number = COALESCE($2, room_number),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`,
      [
        name !== undefined ? name.trim() : null,
        room_number !== undefined ? room_number.trim() : null,
        description !== undefined ? description.trim() : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Classroom not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      classroom: updateRes.rows[0],
      message: 'Classroom updated successfully.'
    });
  } catch (error) {
    console.error('Error updating classroom:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove classroom
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffClassroomAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Classroom ID is required.' }, { status: 400 });
    }

    const delRes = await query(
      `DELETE FROM website_classrooms WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Classroom not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Classroom and all associated materials deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

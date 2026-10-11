import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyTeacherClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

// GET: List lectures for classroom
export async function GET(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const classroomId = resolvedParams?.id;

    const auth = await verifyTeacherClassroomAccess(request, context, 'view', classroomId);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const res = await query(
      `SELECT l.*,
              sub.name AS subject_name,
              sub.code AS subject_code,
              wt.name AS teacher_name
       FROM website_classroom_lectures l
       LEFT JOIN website_subjects sub ON sub.id = l.subject_id
       LEFT JOIN website_teachers wt ON wt.id = l.created_by_teacher_id
       WHERE l.classroom_id = $1 AND l.website_id = $2
       ORDER BY l.created_at DESC`,
      [classroomId, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      lectures: res.rows
    });
  } catch (error) {
    console.error('Error fetching lectures:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add lecture
export async function POST(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const classroomId = resolvedParams?.id;

    const auth = await verifyTeacherClassroomAccess(request, context, 'create', classroomId);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const classroom = auth.classroom;
    const body = await request.json().catch(() => ({}));
    const { title, subject_id, pdf_url, description } = body;

    if (!title?.trim() || !subject_id) {
      return NextResponse.json(
        { success: false, error: 'Lecture Title and Subject are required.' },
        { status: 400 }
      );
    }

    const insertRes = await query(
      `INSERT INTO website_classroom_lectures
       (website_id, classroom_id, class_id, session_id, subject_id, title, pdf_url, description, created_by_teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        auth.website.id,
        classroom.id,
        classroom.class_id,
        classroom.session_id,
        subject_id,
        title.trim(),
        pdf_url?.trim() || null,
        description || null,
        auth.teacher.id
      ]
    );

    return NextResponse.json({
      success: true,
      lecture: insertRes.rows[0],
      message: 'Lecture posted successfully.'
    });
  } catch (error) {
    console.error('Error creating lecture:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update lecture
export async function PUT(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const classroomId = resolvedParams?.id;

    const auth = await verifyTeacherClassroomAccess(request, context, 'edit', classroomId);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { id, title, subject_id, pdf_url, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lecture ID is required.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE website_classroom_lectures
       SET title = COALESCE($1, title),
           subject_id = COALESCE($2, subject_id),
           pdf_url = COALESCE($3, pdf_url),
           description = COALESCE($4, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND classroom_id = $6 AND website_id = $7
       RETURNING *`,
      [
        title !== undefined ? title.trim() : null,
        subject_id !== undefined ? subject_id : null,
        pdf_url !== undefined ? (pdf_url?.trim() || null) : null,
        description !== undefined ? description : null,
        id,
        classroomId,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lecture not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lecture: updateRes.rows[0],
      message: 'Lecture updated successfully.'
    });
  } catch (error) {
    console.error('Error updating lecture:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete lecture
export async function DELETE(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const classroomId = resolvedParams?.id;

    const auth = await verifyTeacherClassroomAccess(request, context, 'delete', classroomId);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lecture ID is required.' }, { status: 400 });
    }

    const delRes = await query(
      `DELETE FROM website_classroom_lectures 
       WHERE id = $1 AND classroom_id = $2 AND website_id = $3
       RETURNING id`,
      [id, classroomId, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lecture not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lecture deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

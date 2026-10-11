import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyTeacherClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

// GET: List assignments for classroom
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
      `SELECT a.*,
              sub.name AS subject_name,
              sub.code AS subject_code,
              wt.name AS teacher_name
       FROM website_classroom_assignments a
       LEFT JOIN website_subjects sub ON sub.id = a.subject_id
       LEFT JOIN website_teachers wt ON wt.id = a.created_by_teacher_id
       WHERE a.classroom_id = $1 AND a.website_id = $2
       ORDER BY a.submission_date ASC, a.created_at DESC`,
      [classroomId, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      assignments: res.rows
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add assignment
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
    const { topic_name, description, submission_date, subject_id, pdf_url } = body;

    if (!topic_name?.trim() || !submission_date || !subject_id) {
      return NextResponse.json(
        { success: false, error: 'Topic Name, Subject, and Submission Date are required.' },
        { status: 400 }
      );
    }

    const insertRes = await query(
      `INSERT INTO website_classroom_assignments
       (website_id, classroom_id, class_id, session_id, subject_id, topic_name, description, submission_date, pdf_url, created_by_teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        auth.website.id,
        classroom.id,
        classroom.class_id,
        classroom.session_id,
        subject_id,
        topic_name.trim(),
        description || null,
        submission_date,
        pdf_url?.trim() || null,
        auth.teacher.id
      ]
    );

    return NextResponse.json({
      success: true,
      assignment: insertRes.rows[0],
      message: 'Assignment published successfully.'
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update assignment
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
    const { id, topic_name, description, submission_date, subject_id, pdf_url } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment ID is required.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE website_classroom_assignments
       SET topic_name = COALESCE($1, topic_name),
           description = COALESCE($2, description),
           submission_date = COALESCE($3, submission_date),
           subject_id = COALESCE($4, subject_id),
           pdf_url = COALESCE($5, pdf_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND classroom_id = $7 AND website_id = $8
       RETURNING *`,
      [
        topic_name !== undefined ? topic_name.trim() : null,
        description !== undefined ? description : null,
        submission_date !== undefined ? submission_date : null,
        subject_id !== undefined ? subject_id : null,
        pdf_url !== undefined ? (pdf_url?.trim() || null) : null,
        id,
        classroomId,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignment: updateRes.rows[0],
      message: 'Assignment updated successfully.'
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete assignment
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
      return NextResponse.json({ success: false, error: 'Assignment ID is required.' }, { status: 400 });
    }

    const delRes = await query(
      `DELETE FROM website_classroom_assignments 
       WHERE id = $1 AND classroom_id = $2 AND website_id = $3
       RETURNING id`,
      [id, classroomId, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

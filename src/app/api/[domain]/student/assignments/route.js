import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const studentId = session.id;

    // Fetch student's class & session
    const studentRes = await queryDb(
      `SELECT class_id, session_id FROM website_students WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0 || !studentRes.rows[0].class_id) {
      return NextResponse.json({ success: true, assignments: [] });
    }

    const classId = studentRes.rows[0].class_id;

    // Fetch assignments with student submission status
    const assignmentsRes = await queryDb(
      `SELECT a.*,
              s.name AS subject_name, s.code AS subject_code,
              t.name AS teacher_name,
              c.name AS class_name,
              subm.id AS submission_id,
              subm.submission_text,
              subm.file_url AS submission_file_url,
              subm.marks_obtained,
              subm.feedback,
              subm.status AS submission_status,
              subm.submitted_at
       FROM website_classroom_assignments a
       JOIN website_subjects s ON s.id = a.subject_id
       LEFT JOIN website_classes c ON c.id = a.class_id
       LEFT JOIN website_teachers t ON t.id = a.created_by_teacher_id
       LEFT JOIN website_classroom_assignment_submissions subm 
         ON subm.assignment_id = a.id AND subm.student_id = $1 AND subm.website_id = a.website_id
       WHERE a.website_id = $2 AND a.class_id = $3
       ORDER BY a.submission_date ASC, a.id DESC`,
      [studentId, website.id, classId]
    );

    const assignments = assignmentsRes.rows.map(item => ({
      ...item,
      is_submitted: Boolean(item.submission_id),
      status: item.submission_status || (new Date(item.submission_date) < new Date() ? 'overdue' : 'pending')
    }));

    return NextResponse.json({
      success: true,
      assignments,
      payload: { assignments },
      paylod: { assignments }
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { assignment_id, submission_text, file_url } = body;

    if (!assignment_id) {
      return NextResponse.json({ success: false, error: 'Assignment ID is required.' }, { status: 400 });
    }

    if (!submission_text && !file_url) {
      return NextResponse.json({ success: false, error: 'Please provide submission answer text or attachment URL.' }, { status: 400 });
    }

    // Verify assignment belongs to this tenant
    const assignCheck = await queryDb(
      `SELECT id, submission_date FROM website_classroom_assignments WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [assignment_id, website.id]
    );

    if (assignCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 });
    }

    const isLate = new Date() > new Date(assignCheck.rows[0].submission_date);
    const status = isLate ? 'late' : 'submitted';

    // Upsert submission
    const submRes = await queryDb(
      `INSERT INTO website_classroom_assignment_submissions (
         website_id, assignment_id, student_id, submission_text, file_url, status, submitted_at
       ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (website_id, assignment_id, student_id) DO UPDATE
       SET submission_text = EXCLUDED.submission_text,
           file_url = COALESCE(EXCLUDED.file_url, website_classroom_assignment_submissions.file_url),
           status = EXCLUDED.status,
           submitted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [website.id, assignment_id, session.id, submission_text || null, file_url || null, status]
    );

    return NextResponse.json({
      success: true,
      message: 'Assignment submitted successfully!',
      submission: submRes.rows[0]
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

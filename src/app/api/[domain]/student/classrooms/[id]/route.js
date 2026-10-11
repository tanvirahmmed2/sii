import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyStudentClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

// GET: Specific classroom and all its materials for enrolled student
export async function GET(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const classroomId = resolvedParams?.id;

    const auth = await verifyStudentClassroomAccess(request, context, classroomId);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const classroom = auth.classroom;

    const [syllabusRes, assignmentsRes, lecturesRes, notesRes] = await Promise.all([
      query(
        `SELECT s.*,
                sub.name AS subject_name,
                sub.code AS subject_code,
                wt.name AS teacher_name
         FROM website_classroom_syllabus s
         LEFT JOIN website_subjects sub ON sub.id = s.subject_id
         LEFT JOIN website_teachers wt ON wt.id = s.created_by_teacher_id
         WHERE s.classroom_id = $1 AND s.website_id = $2
         ORDER BY s.created_at DESC`,
        [classroomId, auth.website.id]
      ),
      query(
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
      ),
      query(
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
      ),
      query(
        `SELECT n.*,
                sub.name AS subject_name,
                sub.code AS subject_code,
                wt.name AS teacher_name
         FROM website_classroom_notes n
         LEFT JOIN website_subjects sub ON sub.id = n.subject_id
         LEFT JOIN website_teachers wt ON wt.id = n.created_by_teacher_id
         WHERE n.classroom_id = $1 AND n.website_id = $2
         ORDER BY n.created_at DESC`,
        [classroomId, auth.website.id]
      )
    ]);

    return NextResponse.json({
      success: true,
      classroom,
      syllabus: syllabusRes.rows,
      assignments: assignmentsRes.rows,
      lectures: lecturesRes.rows,
      notes: notesRes.rows
    });
  } catch (error) {
    console.error('Error fetching student classroom materials:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

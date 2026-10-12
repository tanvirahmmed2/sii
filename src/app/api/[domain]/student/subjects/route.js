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

    const studentId = session.id;

    // Fetch student's class
    const studentRes = await queryDb(
      `SELECT class_id FROM website_students WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0 || !studentRes.rows[0].class_id) {
      return NextResponse.json({ success: true, subjects: [], payload: { subjects: [] }, paylod: { subjects: [] } });
    }

    const classId = studentRes.rows[0].class_id;

    // Fetch subjects assigned to this class
    const subjectsRes = await queryDb(
      `SELECT cs.id AS class_subject_id,
              s.id AS subject_id,
              s.name AS subject_name,
              s.code AS subject_code,
              COALESCE(cs.full_marks, s.full_marks, 100)::numeric AS full_marks,
              COALESCE(cs.pass_marks, s.pass_marks, 33)::numeric AS pass_marks,
              t.name AS teacher_name,
              t.email AS teacher_email,
              COALESCE((
                SELECT COUNT(*) FROM website_classroom_syllabus syl 
                WHERE syl.website_id = $1 AND syl.subject_id = s.id
              ), 0)::int AS syllabus_count,
              COALESCE((
                SELECT COUNT(*) FROM website_classroom_assignments ca 
                WHERE ca.website_id = $1 AND ca.subject_id = s.id
              ), 0)::int AS assignments_count,
              COALESCE((
                SELECT COUNT(*) FROM website_classroom_lectures cl 
                WHERE cl.website_id = $1 AND cl.subject_id = s.id
              ), 0)::int AS lectures_count
       FROM website_class_subjects cs
       JOIN website_subjects s ON s.id = cs.subject_id
       LEFT JOIN website_teacher_subjects ts ON ts.subject_id = s.id AND ts.website_id = cs.website_id
       LEFT JOIN website_teachers t ON t.id = ts.teacher_id
       WHERE cs.website_id = $1 AND cs.class_id = $2
       ORDER BY s.name ASC`,
      [website.id, classId]
    );

    const subjects = subjectsRes.rows;

    return NextResponse.json({
      success: true,
      subjects,
      payload: { subjects },
      paylod: { subjects }
    });
  } catch (error) {
    console.error('Error fetching student subjects:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyStudentClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

// GET: List classrooms for this student's class & session
export async function GET(request, context) {
  try {
    const auth = await verifyStudentClassroomAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const student = auth.student;

    if (!student.class_id) {
      return NextResponse.json({
        success: true,
        classrooms: [],
        message: 'Student is not currently enrolled in any class.'
      });
    }

    let whereClause = `WHERE c.website_id = $1 AND c.class_id = $2 AND c.is_active = TRUE`;
    const params = [auth.website.id, student.class_id];

    if (student.session_id) {
      params.push(student.session_id);
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
      ORDER BY c.name ASC
    `;

    const res = await query(sql, params);

    return NextResponse.json({
      success: true,
      classrooms: res.rows
    });
  } catch (error) {
    console.error('Error fetching student classrooms:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyTeacherClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

// GET: List classrooms accessible to this teacher
export async function GET(request, context) {
  try {
    const auth = await verifyTeacherClassroomAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const teacher = auth.teacher;

    // Check teacher's assigned classes
    const assignmentCheck = await query(
      `SELECT 
         (SELECT COUNT(*) FROM website_teacher_subjects WHERE website_id = $1 AND teacher_id = $2) AS total_subjects_assigned,
         ARRAY_AGG(DISTINCT class_id) FILTER (WHERE class_id IS NOT NULL) AS assigned_class_ids
       FROM website_teacher_subjects
       WHERE website_id = $1 AND teacher_id = $2`,
      [auth.website.id, teacher.id]
    );

    const periodCheck = await query(
      `SELECT ARRAY_AGG(DISTINCT class_id) FILTER (WHERE class_id IS NOT NULL) AS period_class_ids
       FROM website_teacher_class_periods
       WHERE website_id = $1 AND teacher_id = $2`,
      [auth.website.id, teacher.id]
    );

    const totalAssigned = parseInt(assignmentCheck.rows[0]?.total_subjects_assigned || '0', 10);
    const assignedClassIds = assignmentCheck.rows[0]?.assigned_class_ids || [];
    const periodClassIds = periodCheck.rows[0]?.period_class_ids || [];
    const combinedClassIds = Array.from(new Set([...assignedClassIds, ...periodClassIds]));

    let whereClause = `WHERE c.website_id = $1 AND c.is_active = TRUE`;
    const params = [auth.website.id];

    // If teacher has explicit assignments in the school, filter to their classes
    if (totalAssigned > 0 && combinedClassIds.length > 0) {
      params.push(combinedClassIds);
      whereClause += ` AND c.class_id = ANY($${params.length})`;
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
    console.error('Error fetching teacher classrooms:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

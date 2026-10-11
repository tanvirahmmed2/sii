import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db.js';
import { verifyTeacherClassroomAccess } from 'src/lib/middleware/classroom_auth.js';

// GET: Classroom detail & subjects for class
export async function GET(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const classroomId = resolvedParams?.id;

    const auth = await verifyTeacherClassroomAccess(request, context, 'view', classroomId);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const classroom = auth.classroom;

    // Fetch subjects available for this class
    const subjectsRes = await query(
      `SELECT ws.id, ws.name, ws.code, ws.type
       FROM website_subjects ws
       JOIN website_class_subjects wcs ON wcs.subject_id = ws.id
       WHERE wcs.class_id = $1 AND ws.website_id = $2
       ORDER BY ws.name ASC`,
      [classroom.class_id, auth.website.id]
    );

    // If no subjects mapped to class yet, fallback to all website subjects
    let subjects = subjectsRes.rows;
    if (subjects.length === 0) {
      const allSubjRes = await query(
        `SELECT id, name, code, type FROM website_subjects WHERE website_id = $1 ORDER BY name ASC`,
        [auth.website.id]
      );
      subjects = allSubjRes.rows;
    }

    return NextResponse.json({
      success: true,
      classroom,
      subjects
    });
  } catch (error) {
    console.error('Error fetching teacher classroom details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

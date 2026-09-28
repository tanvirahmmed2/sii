import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Not authenticated', error: 'Unauthorized', paylod: null }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, message: 'Invalid token', error: 'Unauthorized', paylod: null }, { status: 401 });
    }

    const teacherId = decoded.id;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id'); // optional

    if (!classId) {
      return NextResponse.json({ success: false, message: 'class_id is required', error: 'Bad Request', paylod: null }, { status: 400 });
    }

    // Verify teacher is assigned to this class (and optionally section)
    const authCheck = await query(
      `SELECT 1 FROM class_subject_teachers cst
       JOIN class_subjects cs ON cst.class_subject_id = cs.id
       WHERE cst.teacher_id = $1 AND cs.class_id = $2
       ${sectionId ? 'AND (cst.section_id = $3 OR cst.section_id IS NULL)' : ''}
       LIMIT 1`,
      sectionId ? [teacherId, classId, sectionId] : [teacherId, classId]
    );

    if (authCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Unauthorized for this class', error: 'Forbidden', paylod: null }, { status: 403 });
    }

    // Fetch students for the class (and optionally section)
    const studentsRes = await query(
      `SELECT s.id, s.registration_number, s.name as student_name
       FROM students s
       WHERE s.class_id = $1
       ${sectionId ? 'AND s.section_id = $2' : ''}
       AND s.is_registered = TRUE
       ORDER BY s.registration_number ASC`,
      sectionId ? [classId, sectionId] : [classId]
    );

    const res_data = { students: studentsRes.rows };
    return NextResponse.json({ success: true, message: 'Students fetched successfully', paylod: res_data }, { status: 200 });

  } catch (error) {
    console.error('Error fetching students for attendance list:', error);
    return NextResponse.json({ success: false, message: 'Internal server error', error: 'Internal Server Error', paylod: null }, { status: 500 });
  }
}

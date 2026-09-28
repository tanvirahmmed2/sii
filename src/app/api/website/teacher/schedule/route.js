import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({
        success: false,
        message: 'Invalid token',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const teacherId = decoded.id;

    // Fetch schedules/routines where this teacher is assigned via class_subject_teachers mapping
    const routineRes = await query(`
      SELECT 
        r.id, 
        d.name as day_of_week, 
        TO_CHAR(r.start_time, 'HH24:MI') as start_time,
        TO_CHAR(r.end_time, 'HH24:MI') as end_time,
        (TO_CHAR(r.start_time, 'HH12:MI AM') || ' - ' || TO_CHAR(r.end_time, 'HH12:MI AM')) AS times,
        sec.room_number as room_number,
        c.name as class_name, 
        COALESCE(sec.name, 'All Sections') as section_name,
        sub.name as subject_name, 
        sub.code as subject_code
      FROM class_routines r
      JOIN classes c ON r.class_id = c.id
      LEFT JOIN sections sec ON r.section_id = sec.id
      JOIN subjects sub ON r.subject_id = sub.id
      JOIN days d ON r.day_id = d.id
      JOIN class_subjects cs ON cs.class_id = r.class_id AND cs.subject_id = r.subject_id
      JOIN class_subject_teachers cst ON cst.class_subject_id = cs.id AND (cst.section_id = r.section_id OR cst.section_id IS NULL OR r.section_id IS NULL)
      WHERE cst.teacher_id = $1
      ORDER BY 
        r.day_id ASC,
        r.start_time ASC
    `, [teacherId]);

    const res_data = { routine: routineRes.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched teacher routine schedule',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher routine:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

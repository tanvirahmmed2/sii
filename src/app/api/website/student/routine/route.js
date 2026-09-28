import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
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

    const studentId = decoded.id;

    // Get student class & section
    const studentRes = await query(`
      SELECT class_id, section_id FROM students WHERE id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Student not found',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const { class_id, section_id } = studentRes.rows[0];

    // Fetch routine mapping dynamically supporting class-wide routines (where section_id IS NULL)
    const routineRes = await query(`
      SELECT 
        r.id, 
        d.name as day_of_week, 
        TO_CHAR(r.start_time, 'HH24:MI') as start_time,
        TO_CHAR(r.end_time, 'HH24:MI') as end_time,
        (TO_CHAR(r.start_time, 'HH12:MI AM') || ' - ' || TO_CHAR(r.end_time, 'HH12:MI AM')) AS times,
        sec.room_number as room_number,
        sub.name as subject_name, 
        sub.code as subject_code,
        t.name as teacher_name
      FROM class_routines r
      LEFT JOIN sections sec ON r.section_id = sec.id
      JOIN subjects sub ON r.subject_id = sub.id
      JOIN days d ON r.day_id = d.id
      LEFT JOIN class_subjects cs ON cs.class_id = r.class_id AND cs.subject_id = r.subject_id
      LEFT JOIN class_subject_teachers cst ON cst.class_subject_id = cs.id AND (cst.section_id = r.section_id OR cst.section_id IS NULL OR r.section_id IS NULL)
      LEFT JOIN teachers t ON cst.teacher_id = t.id
      WHERE r.class_id = $1 AND (r.section_id = $2 OR r.section_id IS NULL)
      ORDER BY 
        r.day_id ASC,
        r.start_time ASC
    `, [class_id, section_id]);

    const res_data = { routine: routineRes.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched routine schedule',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student class routine:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

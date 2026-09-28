import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { syncExamStatuses } from '@/lib/exams';

export async function GET() {
  try {
    await syncExamStatuses();
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
    if (!token) {
      const res_err_326 = { error: 'Not authenticated' };
      return NextResponse.json({
        success: false,
        message: res_err_326?.error || res_err_326?.message || 'An error occurred',
        error: res_err_326?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_715 = { error: 'Invalid token' };
      return NextResponse.json({
        success: false,
        message: res_err_715?.error || res_err_715?.message || 'An error occurred',
        error: res_err_715?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const studentId = decoded.id;

    // Get student class
    const studentRes = await query(`
      SELECT class_id FROM students WHERE id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) {
      const res_err_1236 = { error: 'Student not found' };
      return NextResponse.json({
        success: false,
        message: res_err_1236?.error || res_err_1236?.message || 'An error occurred',
        error: res_err_1236?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const { class_id } = studentRes.rows[0];

    // Fetch schedules for student's class
    const schedulesRes = await query(`
      SELECT es.id, es.exam_date, es.start_time, es.end_time, es.room_number,
             e.name as exam_name, e.term as exam_term, e.status as exam_status, e.exam_fee,
             sub.name as subject_name, sub.code as subject_code
      FROM exam_schedules es
      JOIN exams e ON es.exam_id = e.id
      JOIN subjects sub ON es.subject_id = sub.id
      WHERE es.class_id = $1
      ORDER BY es.exam_date ASC, es.start_time ASC
    `, [class_id]);

    const res_data_1478 = { examSchedules: schedulesRes.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1478?.message || 'Successfully fecthed data',
        paylod: res_data_1478
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student exam schedules:', error);
    const res_err_2556 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_2556?.error || res_err_2556?.message || 'An error occurred',
        error: res_err_2556?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

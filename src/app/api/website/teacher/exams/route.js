import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { syncExamStatuses } from '@/lib/exams';

export async function GET() {
  try {
    await syncExamStatuses();

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;

    if (!token) {
      const res_err_326 = { error: 'Not authenticated as teacher' };
      return NextResponse.json({
        success: false,
        message: res_err_326?.error || 'An error occurred',
        error: res_err_326?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_715 = { error: 'Invalid teacher token' };
      return NextResponse.json({
        success: false,
        message: res_err_715?.error || 'An error occurred',
        error: res_err_715?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // Fetch exams with their schedules
    const examsRes = await query(`
      SELECT e.*, c.name AS class_name 
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
      ORDER BY e.start_date DESC
    `);

    const schedulesRes = await query(`
      SELECT es.*, c.name as class_name, sub.name as subject_name, sub.code as subject_code
      FROM exam_schedules es
      JOIN classes c ON es.class_id = c.id
      JOIN subjects sub ON es.subject_id = sub.id
      ORDER BY es.exam_date ASC, es.start_time ASC
    `);

    const res_data = {
      exams: examsRes.rows,
      schedules: schedulesRes.rows
    };

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched teacher exam routines',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher exam routines:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

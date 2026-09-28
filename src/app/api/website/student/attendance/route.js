import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
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

    // Fetch student's attendance history
    const historyRes = await query(`
      SELECT 
        sa.id, 
        sa.date, 
        sa.status, 
        sa.remarks,
        sub.name AS subject_name,
        sub.code AS subject_code,
        p.name AS period_name,
        p.start_time,
        p.end_time
      FROM student_attendances sa 
      JOIN subjects sub ON sa.subject_id = sub.id
      JOIN periods p ON sa.period_id = p.id
      WHERE sa.student_id = $1 
      ORDER BY sa.date DESC, p.start_time ASC
    `, [studentId]);

    // Fetch summaries
    const summaryRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'Late' THEN 1 END) as late
      FROM student_attendances 
      WHERE student_id = $1
    `, [studentId]);

    const res_data_1317 = {
      history: historyRes.rows,
      summary: summaryRes.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_1317?.message || 'Successfully fecthed data',
        paylod: res_data_1317
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student attendance history:', error);
    const res_err_2204 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_2204?.error || res_err_2204?.message || 'An error occurred',
        error: res_err_2204?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

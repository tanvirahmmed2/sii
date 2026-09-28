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

    // 1. Get student profile details
    const studentRes = await query(`
      SELECT class_id, section_id FROM students WHERE id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) {
      const res_err_1261 = { error: 'Student not found' };
      return NextResponse.json({
        success: false,
        message: res_err_1261?.error || res_err_1261?.message || 'An error occurred',
        error: res_err_1261?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const { class_id, section_id } = studentRes.rows[0];

    // 2. Count subjects in class_subjects
    const subjectsCountRes = await query(`
      SELECT COUNT(DISTINCT subject_id) as count FROM class_subjects 
      WHERE class_id = $1
    `, [class_id]);
    const subjectsCount = parseInt(subjectsCountRes.rows[0]?.count || 0, 10);

    // 3. Calculate attendance stats
    const attendanceStatsRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('Present', 'Late') THEN 1 END) as present
      FROM student_attendances 
      WHERE student_id = $1
    `, [studentId]);

    const totalDays = parseInt(attendanceStatsRes.rows[0]?.total || 0, 10);
    const presentDays = parseInt(attendanceStatsRes.rows[0]?.present || 0, 10);
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // 4. Count unpaid fees and fines
    const unpaidFeesRes = await query(`
      SELECT COUNT(*) as count FROM student_fees 
      WHERE student_id = $1 AND LOWER(status) IN ('unpaid', 'partially paid')
    `, [studentId]);
    const unpaidFeesCount = parseInt(unpaidFeesRes.rows[0]?.count || 0, 10);

    const unpaidFinesRes = await query(`
      SELECT COUNT(*) as count FROM student_fines 
      WHERE student_id = $1 AND LOWER(status) = 'unpaid'
    `, [studentId]);
    const unpaidFinesCount = parseInt(unpaidFinesRes.rows[0]?.count || 0, 10);

    // 5. Count joined clubs
    const clubsCountRes = await query(`
      SELECT COUNT(*) as count FROM club_members WHERE student_id = $1
    `, [studentId]);
    const clubsCount = parseInt(clubsCountRes.rows[0]?.count || 0, 10);

    const res_data_2636 = {
      stats: {
        subjectsCount,
        attendanceRate,
        unpaidFeesCount,
        unpaidFinesCount,
        clubsCount,
        totalAttendanceDays: totalDays,
        presentAttendanceDays: presentDays
      }
    };
      return NextResponse.json({
        success: true,
        message: res_data_2636?.message || 'Successfully fecthed data',
        paylod: res_data_2636
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student dashboard stats:', error);
    const res_err_3910 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_3910?.error || res_err_3910?.message || 'An error occurred',
        error: res_err_3910?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

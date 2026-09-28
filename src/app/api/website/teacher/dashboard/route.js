import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
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

    const teacherId = decoded.id;

    // 1. Total assigned subjects
    const subjectsCountRes = await query(`
      SELECT COUNT(*) as count FROM class_subject_teachers WHERE teacher_id = $1
    `, [teacherId]);
    const subjectsCount = parseInt(subjectsCountRes.rows[0]?.count || 0, 10);

    // 2. Total students in teacher's classes
    const studentsCountRes = await query(`
      SELECT COUNT(DISTINCT s.id) as count 
      FROM students s
      JOIN class_subjects cs ON s.class_id = cs.class_id
      JOIN class_subject_teachers cst ON cst.class_subject_id = cs.id AND (s.section_id = cst.section_id OR cst.section_id IS NULL)
      WHERE cst.teacher_id = $1 AND s.is_registered = TRUE AND s.is_active = TRUE
    `, [teacherId]);
    const studentsCount = parseInt(studentsCountRes.rows[0]?.count || 0, 10);

    // 3. Pending leave applications
    const pendingLeavesRes = await query(`
      SELECT COUNT(*) as count FROM leave_applications 
      WHERE teacher_id = $1 AND status = 'Pending'
    `, [teacherId]);
    const pendingLeavesCount = parseInt(pendingLeavesRes.rows[0]?.count || 0, 10);

    // 4. Total salary received (sum of basic + allowance - deductions for status = 'Paid')
    const salaryReceivedRes = await query(`
      SELECT SUM(basic + allowance - deductions) as total 
      FROM salaries 
      WHERE teacher_id = $1 AND status = 'Paid'
    `, [teacherId]);
    const salaryReceived = parseFloat(salaryReceivedRes.rows[0]?.total || 0);

    const res_data_1946 = {
      stats: {
        subjectsCount,
        studentsCount,
        pendingLeavesCount,
        salaryReceived
      }
    };
      return NextResponse.json({
        success: true,
        message: res_data_1946?.message || 'Successfully fecthed data',
        paylod: res_data_1946
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher dashboard stats:', error);
    const res_err_2884 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_2884?.error || res_err_2884?.message || 'An error occurred',
        error: res_err_2884?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

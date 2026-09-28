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

    // Fetch salary ledger for this teacher
    const result = await query(`
      SELECT id, month, basic, allowance, deductions, status, created_at, updated_at
      FROM salaries
      WHERE teacher_id = $1
      ORDER BY id DESC
    `, [teacherId]);

    const res_data_901 = { salaries: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_901?.message || 'Successfully fecthed data',
        paylod: res_data_901
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher salary history:', error);
    const res_err_1730 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_1730?.error || res_err_1730?.message || 'An error occurred',
        error: res_err_1730?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

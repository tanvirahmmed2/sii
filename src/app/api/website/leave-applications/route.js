import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_244 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_244?.error || res_err_244?.message || 'An error occurred',
        error: res_err_244?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let sql = `
      SELECT la.*, 
             t.name as teacher_name
      FROM leave_applications la
      LEFT JOIN teachers t ON la.teacher_id = t.id
    `;

    if (type === 'teacher') {
      sql += ` WHERE la.teacher_id IS NOT NULL`;
    }

    sql += ` ORDER BY la.id DESC`;

    const result = await query(sql);
    const res_data_799 = { applications: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_799?.message || 'Successfully fecthed data',
        paylod: res_data_799
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching leave applications:', error);
    const res_err_1400 = { error: 'Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1400?.error || res_err_1400?.message || 'An error occurred',
        error: res_err_1400?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

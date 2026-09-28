import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

// GET leave applications submitted by the logged-in teacher
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) {
      const res_err_387 = { error: 'Not authenticated' };
      return NextResponse.json({
        success: false,
        message: res_err_387?.error || res_err_387?.message || 'An error occurred',
        error: res_err_387?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_776 = { error: 'Invalid token' };
      return NextResponse.json({
        success: false,
        message: res_err_776?.error || res_err_776?.message || 'An error occurred',
        error: res_err_776?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const teacherId = decoded.id;

    const result = await query(`
      SELECT id, type, start_date, end_date, reason, status, created_at
      FROM leave_applications
      WHERE teacher_id = $1
      ORDER BY created_at DESC
    `, [teacherId]);

    const res_data_923 = { applications: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_923?.message || 'Successfully fecthed data',
        paylod: res_data_923
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher leave applications:', error);
    const res_err_1760 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_1760?.error || res_err_1760?.message || 'An error occurred',
        error: res_err_1760?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST submit a new leave application
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) {
      const res_err_2285 = { error: 'Not authenticated' };
      return NextResponse.json({
        success: false,
        message: res_err_2285?.error || res_err_2285?.message || 'An error occurred',
        error: res_err_2285?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_2678 = { error: 'Invalid token' };
      return NextResponse.json({
        success: false,
        message: res_err_2678?.error || res_err_2678?.message || 'An error occurred',
        error: res_err_2678?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const teacherId = decoded.id;
    const { type, start_date, end_date, reason } = await request.json();

    if (!type || !start_date || !end_date || !reason) {
      const res_err_3158 = { error: 'All fields (type, start_date, end_date, reason) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_3158?.error || res_err_3158?.message || 'An error occurred',
        error: res_err_3158?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(`
      INSERT INTO leave_applications (teacher_id, type, start_date, end_date, reason)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, type, start_date, end_date, reason, status, created_at
    `, [teacherId, type.trim(), start_date, end_date, reason.trim()]);

    const res_data_2478 = {
      message: 'Leave application submitted successfully.',
      application: result.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_2478?.message || 'Successfully fecthed data',
        paylod: res_data_2478
      }, { status: 200 });
  } catch (error) {
    console.error('Error submitting teacher leave application:', error);
    const res_err_4322 = { error: 'Internal server error' };
      return NextResponse.json({
        success: false,
        message: res_err_4322?.error || res_err_4322?.message || 'An error occurred',
        error: res_err_4322?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

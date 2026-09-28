import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-admin')?.value;

    if (!token) {
      const res_err_325 = { error: 'Unauthorized. Missing token.' };
      return NextResponse.json({
        success: false,
        message: res_err_325?.error || res_err_325?.message || 'An error occurred',
        error: res_err_325?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      const res_err_725 = { error: 'Unauthorized. Invalid or expired token.' };
      return NextResponse.json({
        success: false,
        message: res_err_725?.error || res_err_725?.message || 'An error occurred',
        error: res_err_725?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // Retrieve admin list
    const result = await query(
      `SELECT id, name, email, number, address, is_active, created_at 
       FROM admins 
       ORDER BY id ASC`
    );

    const res_data_829 = { admins: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_829?.message || 'Successfully fecthed data',
      paylod: res_data_829
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admins:', error);
    const res_err_1628 = { error: 'Failed to retrieve admins. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1628?.error || res_err_1628?.message || 'An error occurred',
        error: res_err_1628?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

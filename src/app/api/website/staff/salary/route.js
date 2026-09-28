import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value;
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

    const staffId = decoded.id;

    // Fetch salary ledger for this staff
    const result = await query(`
      SELECT id, month, basic, allowance, deductions, status, created_at, updated_at
      FROM staff_salaries
      WHERE staff_id = $1
      ORDER BY id DESC
    `, [staffId]);

    const res_data = { salaries: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched data',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff salary history:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

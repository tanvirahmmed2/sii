import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET all my attendance logs
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const staffId = decoded.id;

    const result = await query(
      `SELECT id, date, check_in, check_out, status, created_at, updated_at
       FROM staff_attendance
       WHERE staff_id = $1
       ORDER BY date DESC`,
      [staffId]
    );

    return NextResponse.json({
      success: true,
      paylod: { attendance: result.rows }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff attendance:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

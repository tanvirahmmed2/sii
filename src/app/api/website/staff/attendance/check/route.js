import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST() {
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
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Check if record exists for today
    const existCheck = await query(
      `SELECT * FROM staff_attendance WHERE staff_id = $1 AND date = $2`,
      [staffId, today]
    );

    if (existCheck.rows.length === 0) {
      // Perform Check-in
      const result = await query(
        `INSERT INTO staff_attendance (staff_id, date, check_in, status)
         VALUES ($1, $2, $3, 'Present')
         RETURNING *`,
        [staffId, today, timeStr]
      );
      return NextResponse.json({
        success: true,
        message: 'Checked in successfully.',
        paylod: { record: result.rows[0] }
      }, { status: 200 });
    } else {
      const record = existCheck.rows[0];
      if (record.check_out) {
        return NextResponse.json({
          success: false,
          error: 'You have already checked out for today.'
        }, { status: 400 });
      }

      // Perform Check-out
      const result = await query(
        `UPDATE staff_attendance
         SET check_out = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [timeStr, record.id]
      );
      return NextResponse.json({
        success: true,
        message: 'Checked out successfully.',
        paylod: { record: result.rows[0] }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in staff check-in/out:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

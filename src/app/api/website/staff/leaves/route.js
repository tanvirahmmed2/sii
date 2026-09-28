import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET all my leave applications
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
      `SELECT id, type, start_date, end_date, reason, status, created_at, updated_at
       FROM staff_leaves
       WHERE staff_id = $1
       ORDER BY id DESC`,
      [staffId]
    );

    return NextResponse.json({
      success: true,
      paylod: { leaves: result.rows }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff leaves:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// POST file a new leave request
export async function POST(request) {
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
    const { type, start_date, end_date, reason } = await request.json();

    if (!type || !start_date || !end_date || !reason) {
      return NextResponse.json({ success: false, error: 'All fields (type, start_date, end_date, reason) are required.' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO staff_leaves (staff_id, type, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending')
       RETURNING *`,
      [
        staffId,
        type.trim(),
        start_date,
        end_date,
        reason.trim()
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Leave application submitted successfully.',
      paylod: { leave: result.rows[0] }
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting staff leave:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

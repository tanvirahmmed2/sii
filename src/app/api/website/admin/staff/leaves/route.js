import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET all staff leave applications
export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(
      `SELECT l.id, l.type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
              s.name AS staff_name, s.role AS staff_role
       FROM staff_leaves l
       JOIN staffs s ON l.staff_id = s.id
       ORDER BY l.id DESC`
    );

    return NextResponse.json({
      success: true,
      paylod: { leaves: result.rows }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin staff leaves:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT approve/reject staff leave (Admin only)
export async function PUT(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'ID and valid status are required.' }, { status: 400 });
    }

    const result = await query(`
      UPDATE staff_leaves SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Leave application not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Leave application ${status.toLowerCase()} successfully.`,
      paylod: { leave: result.rows[0] }
    });
  } catch (error) {
    console.error('Error updating staff leave application:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}


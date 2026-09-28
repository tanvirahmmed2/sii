import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all student leaves (Admin only)
export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(`
      SELECT sl.*, s.name AS student_name, s.registration_number, c.name AS class_name
      FROM student_leaves sl
      JOIN students s ON sl.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      ORDER BY sl.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      paylod: { leaves: result.rows }
    });
  } catch (error) {
    console.error('Error fetching student leaves:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT approve/reject student leave (Admin only)
export async function PUT(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body; // status = 'Approved' or 'Rejected'

    if (!id || !status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'ID and valid status are required.' }, { status: 400 });
    }

    const result = await query(`
      UPDATE student_leaves SET
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
    console.error('Error updating student leave application:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// PUT update single seat
export async function PUT(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { seat_code, one_time_fee, monthly_fee, status } = await request.json();

    const existingRes = await query('SELECT * FROM hostel_seats WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Seat not found.' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    const newCode = seat_code ? String(seat_code).trim().toUpperCase() : current.seat_code;
    const oneTimeVal = one_time_fee !== undefined ? parseFloat(one_time_fee) : current.one_time_fee;
    const monthlyVal = monthly_fee !== undefined ? parseFloat(monthly_fee) : current.monthly_fee;
    const newStatus = status || current.status;

    // Check duplicate code in same room
    const dupCheck = await query(
      'SELECT id FROM hostel_seats WHERE room_id = $1 AND seat_code = $2 AND id <> $3',
      [current.room_id, newCode, id]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A seat with this code already exists in this room.' }, { status: 400 });
    }

    const updatedRes = await query(
      `UPDATE hostel_seats
       SET seat_code = $1, one_time_fee = $2, monthly_fee = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [newCode, oneTimeVal, monthlyVal, newStatus, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Seat updated successfully.',
      payload: { seat: updatedRes.rows[0] },
      paylod: { seat: updatedRes.rows[0] }
    });
  } catch (error) {
    console.error('Error updating seat:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE single seat
export async function DELETE(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deletion if allocated
    const checkAlloc = await query("SELECT id FROM hostel_allocations WHERE seat_id = $1 AND status = 'active'", [id]);
    if (checkAlloc.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete seat because it is currently allocated to an active student.'
      }, { status: 400 });
    }

    await query('DELETE FROM hostel_seats WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Seat deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting seat:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

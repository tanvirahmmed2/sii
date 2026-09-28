import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update allocation (vacate room)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { status, vacated_at } = await request.json();

    let result;
    if (status === 'Vacated') {
      result = await query(
        `UPDATE hostel_allocations 
         SET status = 'Vacated', vacated_at = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, student_id, room_id, allocated_at, vacated_at, status`,
        [vacated_at ? new Date(vacated_at) : new Date(), id]
      );
    } else {
      result = await query(
        `UPDATE hostel_allocations 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, student_id, room_id, allocated_at, vacated_at, status`,
        [status, id]
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Allocation record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Allocation status updated successfully.',
      allocation: result.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating allocation:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update allocation. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE an allocation record
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const result = await query('DELETE FROM hostel_allocations WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Allocation record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = { message: 'Allocation record deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete allocation record. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

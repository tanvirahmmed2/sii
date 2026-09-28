import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update an academic period (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { name, start_time, end_time } = await request.json();

    if (!name || !start_time || !end_time) {
      const res_err = { error: 'All fields (name, start_time, end_time) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 400 });
    }

    const updatedPeriod = await query(
      `UPDATE periods
       SET name = $1, start_time = $2, end_time = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name.trim(), start_time.trim(), end_time.trim(), id]
    );

    if (updatedPeriod.rowCount === 0) {
      const res_err = { error: 'Academic period not found.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Period updated successfully.',
      period: updatedPeriod.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating period:', error);
    const res_err = { error: 'Failed to update academic period.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}

// DELETE an academic period (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const deleteResult = await query('DELETE FROM periods WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      const res_err = { error: 'Academic period not found.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Period deleted successfully.'
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting period:', error);
    const res_err = { error: 'Failed to delete academic period.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}

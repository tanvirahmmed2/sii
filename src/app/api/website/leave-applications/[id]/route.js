import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_256 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_256?.error || res_err_256?.message || 'An error occurred',
        error: res_err_256?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      const res_err_725 = { error: 'Valid status (Approved or Rejected) is required.' };
      return NextResponse.json({
        success: false,
        message: res_err_725?.error || res_err_725?.message || 'An error occurred',
        error: res_err_725?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `UPDATE leave_applications 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, status`,
      [status, id]
    );

    if (result.rowCount === 0) {
      const res_err_1306 = { error: 'Leave application not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1306?.error || res_err_1306?.message || 'An error occurred',
        error: res_err_1306?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_989 = {
      message: `Leave application status updated to ${status}.`,
      application: result.rows[0],
    };
      return NextResponse.json({
        success: true,
        message: res_data_989?.message || 'Successfully fecthed data',
        paylod: res_data_989
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating leave application:', error);
    const res_err_2127 = { error: 'Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2127?.error || res_err_2127?.message || 'An error occurred',
        error: res_err_2127?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

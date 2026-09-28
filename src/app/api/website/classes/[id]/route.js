import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update a class (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_291 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_291.error,
        error: res_err_291.error,
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { name, numeric_name, code, max_seats, description } = await request.json();

    if (!name || numeric_name === undefined || !code) {
      const res_err_769 = { error: 'All fields (name, numeric_name, code) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_769.error,
        error: res_err_769.error,
        paylod: null
      }, { status: 400 });
    }

    const numericVal = parseInt(numeric_name, 10);
    if (isNaN(numericVal)) {
      const res_err_1199 = { error: 'Numeric name must be a valid number.' };
      return NextResponse.json({
        success: false,
        message: res_err_1199.error,
        error: res_err_1199.error,
        paylod: null
      }, { status: 400 });
    }

    const maxSeatsVal = max_seats !== undefined && max_seats !== '' ? parseInt(max_seats, 10) : 40;
    if (isNaN(maxSeatsVal) || maxSeatsVal < 0) {
      const res_err = { error: 'Max seats must be a valid non-negative number.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 400 });
    }

    // Check unique constraints (excluding current class ID)
    const duplicateCheck = await query(
      'SELECT id, name, code FROM classes WHERE (name = $1 OR code = $2) AND id <> $3',
      [name, code, id]
    );

    if (duplicateCheck.rows.length > 0) {
      const match = duplicateCheck.rows[0];
      if (match.name === name) {
        const res_err_1879 = { error: 'A class with this name already exists.' };
        return NextResponse.json({
          success: false,
          message: res_err_1879.error,
          error: res_err_1879.error,
          paylod: null
        }, { status: 400 });
      }
      if (match.code === code) {
        const res_err_2256 = { error: 'A class with this code already exists.' };
        return NextResponse.json({
          success: false,
          message: res_err_2256.error,
          error: res_err_2256.error,
          paylod: null
        }, { status: 400 });
      }
    }

    const updatedClass = await query(
      `UPDATE classes 
       SET name = $1, numeric_name = $2, code = $3, max_seats = $4, description = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 
       RETURNING *`,
      [name, numericVal, code, maxSeatsVal, description ? description.trim() : null, id]
    );

    if (updatedClass.rowCount === 0) {
      const res_err_notfound = { error: 'Class not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_notfound.error,
        error: res_err_notfound.error,
        paylod: null
      }, { status: 404 });
    }

    const res_data_1850 = {
      message: 'Class updated successfully.',
      class: updatedClass.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data_1850.message,
      paylod: res_data_1850
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating class:', error);
    const res_err_3658 = { error: 'Failed to update class. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_3658.error,
      error: res_err_3658.error,
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a class (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_4167 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_4167.error,
        error: res_err_4167.error,
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const deleteResult = await query('DELETE FROM classes WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      const res_err_4664 = { error: 'Class not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_4664.error,
        error: res_err_4664.error,
        paylod: null
      }, { status: 404 });
    }

    const res_data_2943 = {
      message: 'Class and all its associated sections deleted successfully.'
    };
    return NextResponse.json({
      success: true,
      message: res_data_2943.message,
      paylod: res_data_2943
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting class:', error);
    const res_err_5444 = { error: 'Failed to delete class. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_5444.error,
      error: res_err_5444.error,
      paylod: null
    }, { status: 500 });
  }
}

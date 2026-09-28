import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update a teacher pay scale grade (Admin only)
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
    const { name, basic_salary, allowance } = await request.json();

    if (!name || basic_salary === undefined || allowance === undefined) {
      return NextResponse.json({
        success: false,
        message: 'All fields (name, basic_salary, allowance) are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const basicSalaryVal = parseFloat(basic_salary);
    const allowanceVal = parseFloat(allowance);

    if (isNaN(basicSalaryVal) || isNaN(allowanceVal) || basicSalaryVal < 0 || allowanceVal < 0) {
      return NextResponse.json({
        success: false,
        message: 'Salary and allowance must be valid non-negative numbers.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate grade name excluding current pay grade
    const duplicateCheck = await query(
      'SELECT id FROM teacher_pay_scale WHERE LOWER(name) = LOWER($1) AND id <> $2',
      [name.trim(), id]
    );
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Another pay grade with this name is already registered.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    const updatedGrade = await query(
      `UPDATE teacher_pay_scale
       SET name = $1, basic_salary = $2, allowance = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, basic_salary, allowance`,
      [name.trim(), basicSalaryVal, allowanceVal, id]
    );

    if (updatedGrade.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Teacher pay scale grade not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Teacher pay scale grade updated successfully.',
      payScale: updatedGrade.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating teacher pay scale:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update teacher pay scale. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a teacher pay scale grade (Admin only)
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

    const deleteResult = await query('DELETE FROM teacher_pay_scale WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Teacher pay scale grade not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Teacher pay scale grade deleted successfully.',
      paylod: { id }
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting teacher pay scale:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete teacher pay scale. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

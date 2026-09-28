import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all staff pay scale grades
export async function GET() {
  try {
    const result = await query(
      'SELECT id, name, basic_salary, allowance, created_at, updated_at FROM staff_pay_scale ORDER BY basic_salary ASC'
    );
    const res_data = { payScales: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Staff pay scales retrieved successfully',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff pay scales:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve staff pay scales. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST register a new staff pay scale grade (Admin only)
export async function POST(request) {
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

    // Check duplicate grade name
    const duplicateCheck = await query('SELECT id FROM staff_pay_scale WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A pay grade with this name is already registered.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    const newGrade = await query(
      `INSERT INTO staff_pay_scale (name, basic_salary, allowance)
       VALUES ($1, $2, $3)
       RETURNING id, name, basic_salary, allowance`,
      [name.trim(), basicSalaryVal, allowanceVal]
    );

    const res_data = {
      message: 'Staff pay scale grade created successfully.',
      payScale: newGrade.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff pay scale:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create staff pay scale. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

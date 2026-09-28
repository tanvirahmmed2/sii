import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, getAdminUser } from '@/lib/auth';
import { recordActivityLog } from '@/lib/logger';

// GET all classes
export async function GET() {
  try {
    const result = await query('SELECT * FROM classes ORDER BY numeric_name ASC, name ASC');
    const res_data_320 = { classes: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_320?.message || 'Successfully fecthed data',
        paylod: res_data_320
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classes:', error);
    const res_err_677 = { error: 'Failed to retrieve classes. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_677?.error || res_err_677?.message || 'An error occurred',
        error: res_err_677?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create a new class (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1181 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1181?.error || res_err_1181?.message || 'An error occurred',
        error: res_err_1181?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { name, numeric_name, code, max_seats, description } = await request.json();

    if (!name || numeric_name === undefined || !code) {
      const res_err_1630 = { error: 'All fields (name, numeric_name, code) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1630?.error || res_err_1630?.message || 'An error occurred',
        error: res_err_1630?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const numericVal = parseInt(numeric_name, 10);
    if (isNaN(numericVal)) {
      const res_err_2064 = { error: 'Numeric name must be a valid number.' };
      return NextResponse.json({
        success: false,
        message: res_err_2064?.error || res_err_2064?.message || 'An error occurred',
        error: res_err_2064?.error || 'Internal Server Error',
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

    // Check unique constraints
    const duplicateCheck = await query(
      'SELECT name, code FROM classes WHERE name = $1 OR code = $2',
      [name, code]
    );

    if (duplicateCheck.rows.length > 0) {
      const match = duplicateCheck.rows[0];
      if (match.name === name) {
        const res_err_2692 = { error: 'A class with this name already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_2692?.error || res_err_2692?.message || 'An error occurred',
        error: res_err_2692?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
      }
      if (match.code === code) {
        const res_err_3069 = { error: 'A class with this code already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_3069?.error || res_err_3069?.message || 'An error occurred',
        error: res_err_3069?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
      }
    }

    const newClass = await query(
      `INSERT INTO classes (name, numeric_name, code, max_seats, description) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, numericVal, code, maxSeatsVal, description ? description.trim() : null]
    );

    const createdClass = newClass.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_CLASS',
      entityType: 'class',
      entityId: createdClass.id,
      details: `Created new academic class: ${createdClass.name} (Code: ${createdClass.code})`
    });

    const res_data_2247 = { message: 'Class created successfully.', class: createdClass };

      return NextResponse.json({
        success: true,
        message: res_data_2247?.message || 'Successfully fecthed data',
        paylod: res_data_2247
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    const res_err_4039 = { error: 'Failed to create class. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4039?.error || res_err_4039?.message || 'An error occurred',
        error: res_err_4039?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, getAdminUser } from '@/lib/auth';
import { recordActivityLog } from '@/lib/logger';

// GET all subjects
export async function GET() {
  try {
    const result = await query('SELECT * FROM subjects ORDER BY name ASC');
    const res_data_304 = { subjects: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_304?.message || 'Successfully fecthed data',
        paylod: res_data_304
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    const res_err_663 = { error: 'Failed to retrieve subjects. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_663?.error || res_err_663?.message || 'An error occurred',
        error: res_err_663?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create subject (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1164 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1164?.error || res_err_1164?.message || 'An error occurred',
        error: res_err_1164?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { name, code } = await request.json();

    if (!name || !code) {
      const res_err_1569 = { error: 'Subject Name and Subject Code are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1569?.error || res_err_1569?.message || 'An error occurred',
        error: res_err_1569?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Check unique constraints
    const duplicateCheck = await query(
      'SELECT name, code FROM subjects WHERE name = $1 OR code = $2',
      [name.trim(), code.trim().toUpperCase()]
    );

    if (duplicateCheck.rows.length > 0) {
      const match = duplicateCheck.rows[0];
      if (match.name === name.trim()) {
        const res_err_2240 = { error: 'A subject with this name already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_2240?.error || res_err_2240?.message || 'An error occurred',
        error: res_err_2240?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
      }
      if (match.code === code.trim().toUpperCase()) {
        const res_err_2640 = { error: 'A subject with this code already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_2640?.error || res_err_2640?.message || 'An error occurred',
        error: res_err_2640?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
      }
    }

    const newSubject = await query(
      `INSERT INTO subjects (name, code) 
       VALUES ($1, $2) 
       RETURNING *`,
      [name.trim(), code.trim().toUpperCase()]
    );

    const createdSubject = newSubject.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_SUBJECT',
      entityType: 'subject',
      entityId: createdSubject.id,
      details: `Created subject: ${createdSubject.name} (${createdSubject.code})`
    });

    const res_data_2053 = { message: 'Subject created successfully.', subject: createdSubject };

      return NextResponse.json({
        success: true,
        message: res_data_2053?.message || 'Successfully fecthed data',
        paylod: res_data_2053
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    const res_err_3621 = { error: 'Failed to create subject. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3621?.error || res_err_3621?.message || 'An error occurred',
        error: res_err_3621?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

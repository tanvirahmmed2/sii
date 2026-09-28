import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { comparePassword, signJWT } from '@/lib/auth';
import { recordLoginLog } from '@/lib/logger';

export async function POST(request) {
  try {
    const { registration_number, password } = await request.json();

    if (!registration_number || !password) {
      const res_err_347 = { error: 'Registration number and password are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_347?.error || res_err_347?.message || 'An error occurred',
        error: res_err_347?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Find student
    const result = await query('SELECT * FROM students WHERE LOWER(registration_number) = LOWER($1)', [registration_number.trim()]);
    if (result.rows.length === 0) {
      const res_err_881 = { error: 'Invalid registration number or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_881?.error || res_err_881?.message || 'An error occurred',
        error: res_err_881?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const student = result.rows[0];

    // Check if student completed registration setup
    if (!student.is_registered) {
      const res_err_1344 = { error: 'This account has not yet completed setup. Please register/setup your account first.' };
      return NextResponse.json({
        success: false,
        message: res_err_1344?.error || res_err_1344?.message || 'An error occurred',
        error: res_err_1344?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    // Check if student account is active
    if (!student.is_active) {
      const res_err_1802 = { error: 'Your student account has been deactivated. Please contact administration.' };
      return NextResponse.json({
        success: false,
        message: res_err_1802?.error || res_err_1802?.message || 'An error occurred',
        error: res_err_1802?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, student.password_hash);
    if (!isPasswordValid) {
      const res_err_2313 = { error: 'Invalid registration number or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_2313?.error || res_err_2313?.message || 'An error occurred',
        error: res_err_2313?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // Record login log for student
    await recordLoginLog({
      userType: 'student',
      name: student.name,
      email: student.email || student.registration_number,
      req: request,
      status: 'success'
    });

    // Generate JWT token
    const token = signJWT({
      id: student.id,
      registration_number: student.registration_number,
      email: student.email,
      name: student.name,
      role: 'student'
    });


    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('fit-student', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      sameSite: 'strict',
    });

    const res_data_2033 = {
      message: 'Login successful.',
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        registration_number: student.registration_number,
        phone: student.phone,
        is_active: student.is_active,
        is_registered: student.is_registered
      }
    };
      return NextResponse.json({
        success: true,
        message: res_data_2033?.message || 'Successfully fecthed data',
        paylod: res_data_2033
      }, { status: 200 });
  } catch (error) {
    console.error('Error logging in student:', error);
    const res_err_3847 = { error: 'Failed to authenticate. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3847?.error || res_err_3847?.message || 'An error occurred',
        error: res_err_3847?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// POST: Verify teacher using their unique verification token
// Body: { token: string }
export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Verification token is required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `SELECT id, name, email, number, designation, is_registered, verification_token_expires
       FROM teachers
       WHERE verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid verification token. This link may not exist or has already been used.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const teacher = result.rows[0];

    if (teacher.is_registered) {
      return NextResponse.json({
        success: false,
        message: 'This teacher account has already been set up. Please go to the Teacher Login page.',
        error: 'Already Registered',
        paylod: null
      }, { status: 400 });
    }

    // Check token expiry
    if (new Date() > new Date(teacher.verification_token_expires)) {
      return NextResponse.json({
        success: false,
        message: 'This verification link has expired. Please contact the administration to generate a new one.',
        error: 'Token Expired',
        paylod: null
      }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      message: 'Token verified successfully. Complete your profile setup below.',
      paylod: {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          number: teacher.number,
          designation: teacher.designation
        }
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying teacher token:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to verify token. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT: Complete teacher account setup using their verification token
// Body: { token: string, address: string, password: string }
export async function PUT(request) {
  try {
    const { token, address, password } = await request.json();

    if (!token || !address || !password) {
      return NextResponse.json({
        success: false,
        message: 'All fields (token, address, password) are required to complete account setup.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        message: 'Password must be at least 6 characters.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Verify teacher exists by token and is not yet registered
    const teacherCheck = await query(
      `SELECT id, is_registered, verification_token_expires
       FROM teachers
       WHERE verification_token = $1`,
      [token]
    );

    if (teacherCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid verification token. Please contact the administration.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    if (teacherCheck.rows[0].is_registered) {
      return NextResponse.json({
        success: false,
        message: 'This teacher account has already completed setup.',
        error: 'Already Registered',
        paylod: null
      }, { status: 400 });
    }

    if (new Date() > new Date(teacherCheck.rows[0].verification_token_expires)) {
      return NextResponse.json({
        success: false,
        message: 'This verification link has expired. Please contact the administration.',
        error: 'Token Expired',
        paylod: null
      }, { status: 410 });
    }

    // Hash password
    const hashedPass = await hashPassword(password);

    // Save setup, activate account, and clear the verification token
    const result = await query(
      `UPDATE teachers
       SET address = $1, 
           password_hash = $2,
           is_registered = TRUE,
           is_active = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE verification_token = $3
       RETURNING id, name, email, designation, is_active, is_registered`,
      [address.trim(), hashedPass, token]
    );

    return NextResponse.json({
      success: true,
      message: 'Teacher account setup completed successfully. You can now login.',
      paylod: { teacher: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error completing teacher registration:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to complete registration setup. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

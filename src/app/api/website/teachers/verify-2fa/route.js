import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { signJWT } from '@/lib/auth';
import { recordLoginLog } from '@/lib/logger';

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({
        success: false,
        message: 'Email and verification code are required.',
        error: 'Missing parameters',
        paylod: null,
      }, { status: 400 });
    }

    const result = await query('SELECT * FROM teachers WHERE email = $1 AND is_active = TRUE', [email.trim()]);
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Teacher account not found or inactive.',
        error: 'Account Not Found',
        paylod: null,
      }, { status: 404 });
    }

    const teacher = result.rows[0];

    if (!teacher.two_factor_code || !teacher.two_factor_expires) {
      return NextResponse.json({
        success: false,
        message: 'No active 2FA request found. Please log in again.',
        error: 'Invalid Request',
        paylod: null,
      }, { status: 400 });
    }

    const expiresAt = new Date(teacher.two_factor_expires);
    if (expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        error: 'Code Expired',
        paylod: null,
      }, { status: 400 });
    }

    if (teacher.two_factor_code.trim().toLowerCase() !== code.trim().toLowerCase()) {
      return NextResponse.json({
        success: false,
        message: 'Invalid verification code.',
        error: 'Invalid Code',
        paylod: null,
      }, { status: 401 });
    }

    // Clear 2FA OTP
    await query(
      `UPDATE teachers 
       SET two_factor_code = NULL, two_factor_expires = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [teacher.id]
    );

    // Record login log
    await recordLoginLog({
      userType: 'teacher',
      name: teacher.name,
      email: teacher.email,
      req: request,
      status: 'success',
    });

    const token = signJWT({ id: teacher.id, email: teacher.email, name: teacher.name, role: 'teacher' });

    const cookieStore = await cookies();
    cookieStore.set('fit-teacher', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'strict',
    });

    return NextResponse.json({
      success: true,
      message: 'Verification successful! Redirecting...',
      paylod: { email: teacher.email },
    }, { status: 200 });

  } catch (error) {
    console.error('Error verifying teacher 2FA:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to verify code.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}

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

    // Find admin by email
    const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Admin account not found.',
        error: 'Account Not Found',
        paylod: null,
      }, { status: 404 });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return NextResponse.json({
        success: false,
        message: 'This administrative account is inactive.',
        error: 'Account Inactive',
        paylod: null,
      }, { status: 403 });
    }

    if (!admin.two_factor_code || !admin.two_factor_expires) {
      return NextResponse.json({
        success: false,
        message: 'No active 2FA verification request found. Please log in again.',
        error: 'Invalid Request',
        paylod: null,
      }, { status: 400 });
    }

    // Check expiration
    const expiresAt = new Date(admin.two_factor_expires);
    if (expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        error: 'Code Expired',
        paylod: null,
      }, { status: 400 });
    }

    // Check code match (case-insensitive & trimmed)
    if (admin.two_factor_code.trim().toLowerCase() !== code.trim().toLowerCase()) {
      return NextResponse.json({
        success: false,
        message: 'Invalid verification code.',
        error: 'Invalid Code',
        paylod: null,
      }, { status: 401 });
    }

    // Clear 2FA OTP code and expiration in DB
    await query(
      `UPDATE admins 
       SET two_factor_code = NULL, two_factor_expires = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [admin.id]
    );

    // Record login log for admin
    await recordLoginLog({
      userType: 'admin',
      name: admin.name,
      email: admin.email,
      req: request,
      status: 'success',
    });

    // Sign JWT token
    const token = signJWT({ id: admin.id, email: admin.email, name: admin.name });


    // Set fit-admin cookie
    const cookieStore = await cookies();
    cookieStore.set('fit-admin', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      sameSite: 'strict',
    });

    const res_data = {
      message: 'Two-factor verification successful. Access granted.',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        number: admin.number,
        address: admin.address,
        is_active: admin.is_active,
      },
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data,
    }, { status: 200 });

  } catch (error) {
    console.error('Error verifying 2FA OTP code:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to verify OTP code. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { comparePassword, signJWT } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';
import { recordLoginLog } from '@/lib/logger';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      const res_err_319 = { error: 'Email and password are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_319?.error || res_err_319?.message || 'An error occurred',
        error: res_err_319?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Direct DB lookup
    const result = await query('SELECT * FROM staffs WHERE email = $1', [email.trim()]);

    if (result.rows.length === 0) {
      const res_err_786 = { error: 'Invalid email or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_786?.error || res_err_786?.message || 'An error occurred',
        error: res_err_786?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const staff = result.rows[0];

    if (!staff.is_active || !staff.is_registered) {
      const res_err_1206 = { error: 'Staff account is inactive or not registered.' };
      return NextResponse.json({
        success: false,
        message: res_err_1206?.error || res_err_1206?.message || 'An error occurred',
        error: res_err_1206?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const isPasswordValid = await comparePassword(password, staff.password_hash);
    if (!isPasswordValid) {
      const res_err_1715 = { error: 'Invalid email or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_1715?.error || res_err_1715?.message || 'An error occurred',
        error: res_err_1715?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // Check 2FA setting
    const is2FAEnabled = Boolean(staff.is_two_factor_enabled);

    if (!is2FAEnabled) {
      // Direct login
      await recordLoginLog({
        userType: 'staff',
        name: staff.name,
        email: staff.email,
        req: request,
        status: 'success',
      });

      const token = signJWT({ id: staff.id, email: staff.email, name: staff.name, role: staff.role });
      const cookieStore = await cookies();
      cookieStore.set('fit-staff', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'strict',
      });

      return NextResponse.json({
        success: true,
        requires2FA: false,
        message: 'Logged in successfully!',
        paylod: { requires2FA: false, email: staff.email }
      }, { status: 200 });
    }

    // 2FA Enabled -> Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `UPDATE staffs 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, staff.id]
    );

    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: 'Staff Portal - 2FA Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0;">Staff Portal Two-Factor Security</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">School Management System</p>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello <strong>${staff.name}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">Your 6-digit verification code for logging in to the Staff Portal is:</p>
            <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">
              <span style="font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #0284c7;">${otpCode}</span>
            </div>
            <p style="color: #ef4444; font-size: 13px; font-weight: 500;">This code will expire in 10 minutes and can only be used once.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send staff 2FA email:', emailErr);
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification code email.',
        error: 'Email Error',
        paylod: null
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      requires2FA: true,
      message: 'Two-factor verification code sent to your email.',
      paylod: { requires2FA: true, email: staff.email }
    }, { status: 200 });

  } catch (error) {
    console.error('Error logging in staff:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

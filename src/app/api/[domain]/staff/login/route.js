import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from 'src/lib/database/db';
import { comparePassword, signJWT } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { recordLoginLog } from 'src/lib/database/logger';
import { generateToken } from 'src/lib/utils/random';

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
    const otpCode = generateToken(6);
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
        html: buildStyledEmail({
          title: 'Staff Portal Two-Factor Security',
          subtitle: 'Two-Factor Authentication',
          recipientName: staff.name,
          bodyParagraphs: [
            'Your verification code for logging in to the Staff Portal is ready. Enter this code to complete sign-in:',
          ],
          code: otpCode,
          codeLabel: 'Security Code',
          footerNote: 'This code will expire in 10 minutes and can only be used once. If you did not request this, please secure your account immediately.',
        })
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

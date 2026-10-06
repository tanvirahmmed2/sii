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

    // Find admin
    const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      const res_err_786 = { error: 'Invalid email or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_786?.error || res_err_786?.message || 'An error occurred',
        error: res_err_786?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const admin = result.rows[0];

    // Check if admin is active
    if (!admin.is_active) {
      const res_err_1206 = { error: 'This administrative account has been deactivated. Please contact support.' };
      return NextResponse.json({
        success: false,
        message: res_err_1206?.error || res_err_1206?.message || 'An error occurred',
        error: res_err_1206?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, admin.password_hash);
    if (!isPasswordValid) {
      const res_err_1715 = { error: 'Invalid email or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_1715?.error || res_err_1715?.message || 'An error occurred',
        error: res_err_1715?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // Check 2FA setting (defaults to true if null/undefined)
    const is2FAEnabled = admin.is_two_factor_enabled !== false;

    if (!is2FAEnabled) {
      // Direct login without 2FA step
      await recordLoginLog({
        userType: 'admin',
        name: admin.name,
        email: admin.email,
        req: request,
        status: 'success',
      });

      const token = signJWT({ id: admin.id, email: admin.email, name: admin.name });
      const cookieStore = await cookies();
      cookieStore.set('fit-admin', token, {
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
        paylod: { requires2FA: false, email: admin.email }
      }, { status: 200 });
    }

    // 2FA is Enabled -> Generate pure alphanumeric OTP code
    const otpCode = generateToken(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // Save 2FA OTP code to DB
    await query(
      `UPDATE admins 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, admin.id]
    );

    // Send email with OTP code via Brevo
    try {
      await sendEmail({
        to: admin.email,
        toName: admin.name,
        subject: 'Admin Portal - 2FA Verification Code',
        html: buildStyledEmail({
          title: 'Admin Portal Two-Factor Security',
          subtitle: 'Two-Factor Authentication',
          recipientName: admin.name,
          bodyParagraphs: [
            'Your verification code for logging in to the Admin Portal is ready. Enter this code to complete authentication:',
          ],
          code: otpCode,
          codeLabel: 'Security Code',
          footerNote: 'This verification code will expire in 10 minutes and can only be used once. If you did not attempt to log in, please secure your account immediately.',
        })
      });
    } catch (emailError) {
      console.error('Failed to send 2FA OTP email:', emailError);
      return NextResponse.json({
        success: false,
        message: 'Failed to send 2FA verification email. Please check email server settings.',
        error: 'Internal Server Error',
        paylod: null
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      requires2FA: true,
      message: 'Two-factor verification code sent to your email.',
      paylod: {
        requires2FA: true,
        email: admin.email,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error logging in admin:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to authenticate. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

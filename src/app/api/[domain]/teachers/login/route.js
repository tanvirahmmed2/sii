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
      const res_err_326 = { error: 'Email and password are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_326?.error || res_err_326?.message || 'An error occurred',
        error: res_err_326?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Direct DB lookup
    const result = await query('SELECT * FROM teachers WHERE email = $1', [email.trim()]);

    if (result.rows.length === 0) {
      const res_err_715 = { error: 'Invalid email or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_715?.error || res_err_715?.message || 'An error occurred',
        error: res_err_715?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    const teacher = result.rows[0];

    if (!teacher.is_active || !teacher.is_registered) {
      const res_err_1102 = { error: 'Teacher account is not registered or is inactive.' };
      return NextResponse.json({
        success: false,
        message: res_err_1102?.error || res_err_1102?.message || 'An error occurred',
        error: res_err_1102?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const isPasswordValid = await comparePassword(password, teacher.password_hash);
    if (!isPasswordValid) {
      const res_err_1508 = { error: 'Invalid email or password.' };
      return NextResponse.json({
        success: false,
        message: res_err_1508?.error || res_err_1508?.message || 'An error occurred',
        error: res_err_1508?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // Check 2FA setting
    const is2FAEnabled = Boolean(teacher.is_two_factor_enabled);

    if (!is2FAEnabled) {
      // Direct login without 2FA step
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
        requires2FA: false,
        message: 'Logged in successfully!',
        paylod: { requires2FA: false, email: teacher.email }
      }, { status: 200 });
    }

    // 2FA Enabled -> Generate OTP
    const otpCode = generateToken(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `UPDATE teachers 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, teacher.id]
    );

    try {
      await sendEmail({
        to: teacher.email,
        toName: teacher.name,
        subject: 'Teacher Portal - 2FA Verification Code',
        html: buildStyledEmail({
          title: 'Teacher Portal Two-Factor Security',
          subtitle: 'Two-Factor Authentication',
          recipientName: teacher.name,
          bodyParagraphs: [
            'Your verification code for logging in to the Teacher Portal is ready. Enter this code to complete sign-in:',
          ],
          code: otpCode,
          codeLabel: 'Security Code',
          footerNote: 'This code will expire in 10 minutes and can only be used once. If you did not request this, please secure your account immediately.',
        })
      });
    } catch (emailErr) {
      console.error('Error sending teacher 2FA email:', emailErr);
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
      paylod: { requires2FA: true, email: teacher.email }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in teachers/login:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

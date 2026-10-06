import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { generateToken } from 'src/lib/utils/random';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email address is required.',
        error: 'Missing Email',
        paylod: null,
      }, { status: 400 });
    }

    const result = await query('SELECT * FROM staffs WHERE email = $1 AND is_active = TRUE', [email.trim()]);
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Staff account not found.',
        error: 'Not Found',
        paylod: null,
      }, { status: 404 });
    }

    const staff = result.rows[0];

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
        subject: 'Staff Portal - Resent 2FA Verification Code',
        html: buildStyledEmail({
          title: 'Staff Portal Two-Factor Security',
          subtitle: 'Two-Factor Authentication',
          recipientName: staff.name,
          bodyParagraphs: [
            'Your new verification code for logging in to the Staff Portal is ready:',
          ],
          code: otpCode,
          codeLabel: 'Security Code',
          footerNote: 'This code will expire in 10 minutes and can only be used once. If you did not request this, please secure your account.',
        })
      });
    } catch (emailErr) {
      console.error('Error resending staff 2FA email:', emailErr);
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification email.',
        error: 'Email Error',
        paylod: null,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'A new 2FA verification code has been sent to your email.',
      paylod: { email: staff.email },
    }, { status: 200 });

  } catch (error) {
    console.error('Error in staff resend-2fa:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to resend 2FA code.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}

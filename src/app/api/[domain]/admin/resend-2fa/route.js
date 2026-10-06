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

    // Generate new pure alphanumeric OTP code
    const otpCode = generateToken(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // Update code in DB
    await query(
      `UPDATE admins 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, admin.id]
    );

    // Send email via Brevo
    try {
      await sendEmail({
        to: admin.email,
        toName: admin.name,
        subject: 'Admin Portal - New 2FA Verification Code',
        html: buildStyledEmail({
          title: 'Admin Portal Two-Factor Security',
          subtitle: 'Two-Factor Authentication',
          recipientName: admin.name,
          bodyParagraphs: [
            'You requested a new verification code. Your code for logging in to the Admin Portal is ready:',
          ],
          code: otpCode,
          codeLabel: 'Security Code',
          footerNote: 'This verification code will expire in 10 minutes and can only be used once. If you did not request this, please secure your account immediately.',
        })
      });
    } catch (emailError) {
      console.error('Failed to resend 2FA OTP email:', emailError);
      return NextResponse.json({
        success: false,
        message: 'Failed to send 2FA email. Check email configuration.',
        error: 'Email Dispatch Error',
        paylod: null,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'A new 2FA verification code has been dispatched to your email.',
      paylod: { email: admin.email },
    }, { status: 200 });

  } catch (error) {
    console.error('Error resending 2FA OTP code:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to resend verification code. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}

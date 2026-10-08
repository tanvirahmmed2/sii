import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { generateToken } from 'src/lib/utils/random';

export async function POST(request, context) {
  try {
    const resolvedParams = await context?.params;
    const website = await resolveWebsiteFromRequest(request, { params: resolvedParams });

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Campus portal website not found.' },
        { status: 404 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const result = await queryDb(
      `SELECT * FROM website_staffs 
       WHERE website_id = $1 AND LOWER(email) = LOWER($2) AND is_active = TRUE`,
      [website.id, email.trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff account not found.' },
        { status: 404 }
      );
    }

    const staff = result.rows[0];

    const otpCode = generateToken(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await queryDb(
      `UPDATE website_staffs 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, staff.id]
    );

    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: `${website.name} - Resent 2FA Verification Code`,
        html: buildStyledEmail({
          title: `${website.name} Staff Portal`,
          subtitle: 'Two-Factor Authentication',
          recipientName: staff.name,
          bodyParagraphs: [
            'Your new verification code for logging in to the Staff Portal is ready:',
          ],
          code: otpCode,
          codeLabel: 'Security Code',
          footerNote: 'This code will expire in 10 minutes and can only be used once. If you did not request this, please secure your account.',
        }),
      });
    } catch (emailErr) {
      console.error('Error resending staff 2FA email:', emailErr);
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'A new 2FA verification code has been sent to your email.',
        paylod: { email: staff.email },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in staff resend-2fa:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

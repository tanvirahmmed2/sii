import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hashPassword } from 'src/lib/middleware/developer';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import { generateToken } from 'src/lib/utils/random';

// POST: Request recovery token
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
        {
          success: true,
          message: 'If a staff account with that email exists, we have sent a password reset link.',
        },
        { status: 200 }
      );
    }

    const staff = result.rows[0];
    const recoveryToken = generateToken(8);
    const recoveryExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await queryDb(
      `UPDATE website_staffs
       SET recovery_token = $1, recovery_token_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [recoveryToken, recoveryExpires, staff.id]
    );

    const baseUrl = getBaseUrl(request);
    const recoveryUrl = `${baseUrl}/auth/access/staff/recovery?token=${recoveryToken}`;

    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: `${website.name} - Reset Your Staff Account Password`,
        html: buildStyledEmail({
          title: `${website.name} Password Reset`,
          subtitle: 'Staff Portal Security',
          recipientName: staff.name,
          bodyParagraphs: [
            'You requested to reset your password. Click the button below to choose a new password, or use the security recovery token.',
          ],
          code: recoveryToken,
          codeLabel: 'Recovery Token',
          actionUrl: recoveryUrl,
          actionText: 'Reset Password',
          footerNote: 'This password reset link is valid for 2 hours. If you did not request this, please ignore this email.',
        }),
      });
    } catch (emailErr) {
      console.error('Failed to send recovery email (non-fatal):', emailErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If a staff account with that email exists, we have sent a password reset link.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in staff recovery request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// PUT: Reset password using recovery token
export async function PUT(request, context) {
  try {
    const resolvedParams = await context?.params;
    const website = await resolveWebsiteFromRequest(request, { params: resolvedParams });

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Campus portal website not found.' },
        { status: 404 }
      );
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Recovery token and new password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const staffRes = await queryDb(
      `SELECT id, recovery_token_expires 
       FROM website_staffs 
       WHERE recovery_token = $1 AND website_id = $2`,
      [token.trim(), website.id]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired recovery link.' },
        { status: 400 }
      );
    }

    const staff = staffRes.rows[0];

    if (new Date() > new Date(staff.recovery_token_expires)) {
      return NextResponse.json(
        { success: false, error: 'This recovery link has expired.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await queryDb(
      `UPDATE website_staffs
       SET password = $1, recovery_token = NULL, recovery_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, staff.id]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Your password has been reset successfully. You can now log in.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting staff password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword, revokeAllOfficerSessions, ensureOfficerSchema } from 'src/lib/middleware/officer.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { getWebsiteUrl } from 'src/lib/database/secret.js';

function buildOfficerRecoveryUrl(website, token, request) {
  const origin = getWebsiteUrl(website, request);
  return `${origin}/auth/access/officer/forget-password?token=${encodeURIComponent(token)}`;
}

export async function POST(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Officer email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const officerRes = await queryDb(
      `SELECT id, name, email, is_active, recovery_token_expires
       FROM website_officers
       WHERE website_id = $1 AND LOWER(email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (officerRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No officer account found with this email on this campus.' },
        { status: 404 }
      );
    }

    const officer = officerRes.rows[0];

    if (!officer.is_active) {
      return NextResponse.json(
        { success: false, error: 'This officer account is deactivated. Please contact administration.' },
        { status: 403 }
      );
    }

    if (officer.recovery_token_expires) {
      const remainingMs = new Date(officer.recovery_token_expires).getTime() - Date.now();
      if (remainingMs > 59 * 60 * 1000) {
        return NextResponse.json({
          success: false,
          error: 'Please wait at least 60 seconds before requesting another recovery link.'
        }, { status: 429 });
      }
    }

    const recoveryToken = crypto.randomBytes(32).toString('hex');

    await queryDb(
      `UPDATE website_officers
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour'
       WHERE id = $2`,
      [recoveryToken, officer.id]
    );

    const recoveryUrl = buildOfficerRecoveryUrl(website, recoveryToken, request);

    try {
      const html = buildStyledEmail({
        title: 'Officer Password Recovery',
        subtitle: `${website.name} — Administrative Portal`,
        recipientName: officer.name,
        bodyParagraphs: [
          'We received a request to recover or reset the password for your officer portal account.',
          'Click the button below to establish a new password. This reset link remains active for 1 hour.',
          'If you did not request this, you can ignore this notice; your credentials will remain unchanged.',
        ],
        actionUrl: recoveryUrl,
        actionText: 'Reset Officer Password →',
      });

      await sendEmail({
        to: officer.email,
        toName: officer.name,
        subject: `${website.name} - Officer Password Reset Link`,
        html,
        websiteId: website.id,
      });
    } catch (mailErr) {
      console.warn('Failed to dispatch recovery email to officer:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Password recovery email sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error during officer recovery request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during password recovery request.' },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { token, password } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Password recovery token is required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters in length.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim();

    const officerRes = await queryDb(
      `SELECT id, email, recovery_token_expires
       FROM website_officers
       WHERE website_id = $1 AND recovery_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (officerRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired password reset token.' },
        { status: 400 }
      );
    }

    const officer = officerRes.rows[0];

    if (officer.recovery_token_expires && new Date(officer.recovery_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This password reset link has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await queryDb(
      `UPDATE website_officers
       SET password = $1, recovery_token = NULL, recovery_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, officer.id]
    );

    await revokeAllOfficerSessions(officer.id, website.id);

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Error resetting officer password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error resetting password.' },
      { status: 500 }
    );
  }
}

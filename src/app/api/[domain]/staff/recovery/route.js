import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { hashPassword, revokeAllStaffSessions } from 'src/lib/middleware/staff';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';

function buildStaffRecoveryUrl(website, token, request) {
  const reqHost = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host') || '';
  const baseHost = (reqHost ? reqHost.split(',')[0].trim() : '') || 'localhost:3000';
  const protocol = request?.headers?.get?.('x-forwarded-proto') || (baseHost.includes('localhost') ? 'http' : 'https');

  const rawCustom = (website.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (rawCustom) {
    const customProto = rawCustom.includes('localhost') ? 'http' : 'https';
    return `${customProto}://${rawCustom}/auth/access/staff/recovery?token=${encodeURIComponent(token)}`;
  }

  const rawSub = (website.subdomain || website.slug || '').trim().toLowerCase();
  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

  if (baseHost.includes('localhost')) {
    const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';
    return `${protocol}://${cleanSub}.localhost${port}/auth/access/staff/recovery?token=${encodeURIComponent(token)}`;
  }

  return `${protocol}://${cleanSub}.${baseHost}/auth/access/staff/recovery?token=${encodeURIComponent(token)}`;
}

// POST: Request password reset link
export async function POST(request, context) {
  try {
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
        { success: false, error: 'Staff email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const staffRes = await queryDb(
      `SELECT id, name, email, is_active
       FROM website_staffs
       WHERE website_id = $1 AND LOWER(email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (staffRes.rows.length === 0) {
      // Return 404 so user knows email is not registered for this campus
      return NextResponse.json(
        { success: false, error: 'No staff account found with this email address on this campus.' },
        { status: 404 }
      );
    }

    const staff = staffRes.rows[0];

    if (!staff.is_active) {
      return NextResponse.json(
        { success: false, error: 'This staff account is deactivated. Please contact campus administration.' },
        { status: 403 }
      );
    }

    const recoveryToken = crypto.randomBytes(32).toString('hex');

    await queryDb(
      `UPDATE website_staffs
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour'
       WHERE id = $2`,
      [recoveryToken, staff.id]
    );

    const recoveryUrl = buildStaffRecoveryUrl(website, recoveryToken, request);

    try {
      const html = buildStyledEmail({
        title: 'Staff Password Recovery',
        subtitle: `${website.name} — Staff Operations Portal`,
        recipientName: staff.name,
        bodyParagraphs: [
          'We received a request to reset the password for your staff account.',
          'Click the button below to establish a new password. This reset link is active for 1 hour.',
          'If you did not make this request, you can safely ignore this email; your existing credentials remain active.',
        ],
        actionUrl: recoveryUrl,
        actionText: 'Reset Staff Password →',
      });

      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: `${website.name} - Staff Password Recovery Link`,
        html,
      });
    } catch (mailErr) {
      console.warn('Failed to dispatch recovery email to staff:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Password recovery email sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error during staff recovery request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during password recovery request.' },
      { status: 500 }
    );
  }
}

// PUT: Set new password using recovery token
export async function PUT(request, context) {
  try {
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

    const staffRes = await queryDb(
      `SELECT id, name, recovery_token_expires
       FROM website_staffs
       WHERE website_id = $1 AND recovery_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized recovery token.' },
        { status: 404 }
      );
    }

    const staff = staffRes.rows[0];

    if (staff.recovery_token_expires && new Date(staff.recovery_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This password recovery link has expired. Please request a new one.' },
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

    // Revoke all existing sessions for safety
    await revokeAllStaffSessions(staff.id, website.id);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You may now log in with your new credentials.',
    });
  } catch (error) {
    console.error('Error during staff password reset:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during password reset.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword, revokeAllTeacherSessions } from 'src/lib/middleware/teacher.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

/**
 * Constructs the teacher recovery link using custom domain (if set)
 * or ${subdomain}.${baseDomain}/auth/access/teacher/recovery?token=...
 */
function buildTeacherRecoveryUrl(website, token, request) {
  const reqHost = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host') || '';
  const baseHost = (reqHost ? reqHost.split(',')[0].trim() : '') || 'localhost:3000';
  const protocol = request?.headers?.get?.('x-forwarded-proto') || (baseHost.includes('localhost') ? 'http' : 'https');

  // 1. Custom domain (if set)
  const rawCustom = (website?.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (rawCustom) {
    const customProto = rawCustom.includes('localhost') ? 'http' : 'https';
    return `${customProto}://${rawCustom}/auth/access/teacher/recovery?token=${encodeURIComponent(token)}`;
  }

  // 2. Subdomain of platform base URL
  const rawSub = (website?.subdomain || website?.slug || '').trim().toLowerCase();
  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

  if (baseHost.includes('localhost')) {
    const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';
    return `${protocol}://${cleanSub}.localhost${port}/auth/access/teacher/recovery?token=${encodeURIComponent(token)}`;
  }

  // Production base domain
  const cleanHostNoPort = baseHost.split(':')[0];
  const parts = cleanHostNoPort.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : cleanHostNoPort;
  const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';

  return `${protocol}://${cleanSub}.${baseDomain}${port}/auth/access/teacher/recovery?token=${encodeURIComponent(token)}`;
}

// POST: Request password reset link/token
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
        { success: false, error: 'Teacher email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const teacherRes = await queryDb(
      `SELECT id, name, email, is_active
       FROM website_teachers
       WHERE website_id = $1 AND LOWER(email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No faculty account found with this email on this campus.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (!teacher.is_active) {
      return NextResponse.json(
        { success: false, error: 'This teacher account is deactivated. Please contact campus administration.' },
        { status: 403 }
      );
    }

    // Generate random 64-character token and a convenient 6-digit numeric code
    const recoveryToken = crypto.randomBytes(32).toString('hex');

    await queryDb(
      `UPDATE website_teachers
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour'
       WHERE id = $2`,
      [recoveryToken, teacher.id]
    );

    const recoveryUrl = buildTeacherRecoveryUrl(website, recoveryToken, request);

    try {
      const html = buildStyledEmail({
        title: 'Teacher Password Recovery',
        subtitle: `${website.name} — Teacher Operations Portal`,
        recipientName: teacher.name,
        bodyParagraphs: [
          'We received a request to reset the password for your faculty account.',
          'Click the button below to establish a new password, or use the token code directly on the recovery page.',
          'This password reset link is valid for 1 hour. If you did not make this request, you can safely ignore this email.',
        ],
        code: recoveryToken.substring(0, 8).toUpperCase(),
        codeLabel: 'Security Reference',
        actionUrl: recoveryUrl,
        actionText: 'Reset Teacher Password →',
      });

      await sendEmail({
        to: teacher.email,
        toName: teacher.name,
        subject: `${website.name} - Teacher Password Recovery Link`,
        html,
        websiteId: website.id,
      });
    } catch (mailErr) {
      console.warn('Failed to dispatch recovery email to teacher:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Password recovery link has been sent to your registered email address.',
    });
  } catch (error) {
    console.error('Error during teacher recovery request:', error);
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
    const token = body.token || body.recovery_token || body.recoveryToken;
    const password = body.password || body.new_password || body.newPassword;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Password recovery token is required.' },
        { status: 400 }
      );
    }

    if (!password || String(password).length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters in length.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim();

    const teacherRes = await queryDb(
      `SELECT id, name, email, recovery_token_expires
       FROM website_teachers
       WHERE website_id = $1 AND (recovery_token = $2 OR UPPER(LEFT(recovery_token, 8)) = UPPER($2))
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized recovery token.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (teacher.recovery_token_expires && new Date(teacher.recovery_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Password recovery token has expired. Please request a new link.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(String(password).trim());

    await queryDb(
      `UPDATE website_teachers
       SET password = $1,
           recovery_token = NULL,
           recovery_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, teacher.id]
    );

    // Revoke previous sessions
    await revokeAllTeacherSessions(website.id, teacher.id);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Error resetting teacher password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error while resetting password.' },
      { status: 500 }
    );
  }
}

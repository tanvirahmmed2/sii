import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword, revokeAllTeacherSessions } from 'src/lib/middleware/teacher.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { sendSms } from 'src/lib/database/smsSender.js';
import { getWebsiteUrl } from 'src/lib/database/secret.js';
import {
  inspectMalwareAndAttacks,
  checkRateLimit,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  generateSecureOtp,
  extractClientIp,
} from 'src/lib/security/shield.js';

function buildTeacherRecoveryUrl(website, token, request) {
  const origin = getWebsiteUrl(website, request);
  return `${origin}/auth/access/teacher/recovery?token=${encodeURIComponent(token)}`;
}

export async function POST(request, context) {
  try {
    const attackCheck = inspectMalwareAndAttacks(request);
    if (attackCheck.blocked) {
      return NextResponse.json(
        { success: false, error: 'Suspicious request payload detected.' },
        { status: 403 }
      );
    }

    const clientIp = extractClientIp(request);
    const rateCheck = checkRateLimit(`teacher_recovery_req:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 10,
    });
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many recovery requests. Please wait.' },
        { status: 429 }
      );
    }

    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const identifier = body.identifier || body.email || body.phone || body.number;
    const requestedChannel = String(body.channel || 'email').toLowerCase();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Teacher email address or phone number is required.' },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim();
    const cleanEmail = cleanId.toLowerCase();
    const raw = cleanId;
    const digits = raw.replace(/\D/g, '');

    const teacherRes = await queryDb(
      `SELECT id, name, email, number, COALESCE(phone, number) AS phone, is_active
       FROM website_teachers
       WHERE website_id = $1 AND (
         LOWER(email) = $2
         OR number = $3
         OR phone = $3
         OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(phone, number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
       )
       LIMIT 1`,
      [website.id, cleanEmail, raw, digits]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If an account matches these credentials, a recovery code has been dispatched.',
      });
    }

    const teacher = teacherRes.rows[0];

    if (!teacher.is_active) {
      return NextResponse.json(
        { success: false, error: 'This teacher account is deactivated. Please contact campus administration.' },
        { status: 403 }
      );
    }

    const targetPhone = teacher.phone || teacher.number;
    const selectedChannel = requestedChannel === 'sms' && targetPhone ? 'sms' : 'email';

    const dispatchLimitCheck = await checkOtpDispatchRateLimit({
      identifier: teacher.email,
      phone: targetPhone,
      email: teacher.email,
      ip: clientIp,
    });

    if (!dispatchLimitCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: dispatchLimitCheck.error },
        { status: 429 }
      );
    }

    const recoveryCode = generateSecureOtp(6);

    await queryDb(
      `UPDATE website_teachers
       SET recovery_token = $1, 
           recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [recoveryCode, teacher.id]
    );

    await recordOtpDispatch({
      identifier: teacher.email,
      phone: targetPhone,
      email: teacher.email,
      channel: selectedChannel,
      purpose: 'teacher_recovery',
      ip: clientIp,
    });

    const recoveryUrl = buildTeacherRecoveryUrl(website, recoveryCode, request);
    const institutionName = website.name || 'Institution Teacher Portal';

    if (selectedChannel === 'sms') {
      try {
        await sendSms({
          to: targetPhone,
          message: `Your ${institutionName} password recovery code is: ${recoveryCode}. Valid for 1 hour.`,
          purpose: 'recovery',
          userId: teacher.id,
          userType: 'teacher',
          ip: clientIp,
          websiteId: website.id,
        });
      } catch (smsErr) {
        return NextResponse.json(
          { success: false, error: smsErr.message || 'Failed to dispatch recovery SMS.' },
          { status: 500 }
        );
      }
    } else {
      try {
        const html = buildStyledEmail({
          title: 'Teacher Password Recovery',
          subtitle: `${institutionName} — Faculty Operations Portal`,
          recipientName: teacher.name,
          bodyParagraphs: [
            'We received a request to reset the password for your faculty account.',
            'Click the button below to establish a new password, or use the 6-digit recovery code directly on the recovery page.',
            'This security code is valid for 1 hour. If you did not make this request, you can safely ignore this email.',
          ],
          code: recoveryCode,
          codeLabel: 'Recovery Passcode',
          actionUrl: recoveryUrl,
          actionText: 'Reset Teacher Password →',
        });

        await sendEmail({
          to: teacher.email,
          toName: teacher.name,
          subject: `${institutionName} - Teacher Password Recovery Code`,
          html,
          websiteId: website.id,
        });
      } catch (mailErr) {
        return NextResponse.json(
          { success: false, error: mailErr.message || 'Failed to dispatch recovery email.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Password recovery code dispatched to your registered ${selectedChannel === 'sms' ? 'phone number via SMS' : 'email address'}.`,
      channel: selectedChannel,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error processing recovery request.' },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const attackCheck = inspectMalwareAndAttacks(request);
    if (attackCheck.blocked) {
      return NextResponse.json(
        { success: false, error: 'Suspicious request payload detected.' },
        { status: 403 }
      );
    }

    const clientIp = extractClientIp(request);
    const rateCheck = checkRateLimit(`teacher_recovery_reset:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 10,
    });
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const token = body.token || body.recovery_token || body.recoveryToken || body.code;
    const password = body.password || body.new_password || body.newPassword;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Password recovery verification code is required.' },
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
        { success: false, error: 'Invalid or unrecognized recovery verification code.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (teacher.recovery_token_expires && new Date(teacher.recovery_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Password recovery code has expired. Please request a new code.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(String(password).trim());

    await queryDb(
      `UPDATE website_teachers
       SET password = $1,
           recovery_token = NULL,
           recovery_token_expires = NULL,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, teacher.id]
    );

    await revokeAllTeacherSessions(website.id, teacher.id);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now log into your teacher account.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error resetting password.' },
      { status: 500 }
    );
  }
}

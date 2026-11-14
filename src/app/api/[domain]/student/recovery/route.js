import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword, revokeAllStudentSessions } from 'src/lib/middleware/students.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { sendSms } from 'src/lib/database/smsSender.js';
import { buildStudentRecoveryUrl } from 'src/lib/student/urls.js';
import {
  inspectMalwareAndAttacks,
  checkRateLimit,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  generateSecureOtp,
  extractClientIp,
} from 'src/lib/security/shield.js';

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
    const rateCheck = checkRateLimit(`student_recovery_req:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 10,
    });
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many recovery requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { recovery_token, token, new_password, password } = body;
    const resetCode = recovery_token || token;
    const resetPassword = new_password || password;

    if (resetCode && resetPassword) {
      return handlePasswordReset(website, resetCode, resetPassword);
    }

    const rawIdentifier = body.identifier || body.email || body.phone || body.registration_number || body.registration_no || '';
    const cleanId = String(rawIdentifier).trim();
    const requestedChannel = String(body.channel || 'email').toLowerCase();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: 'Registration number, email address, or phone number is required.' },
        { status: 400 }
      );
    }

    const cleanLower = cleanId.toLowerCase();
    const raw = cleanId;
    const digits = raw.replace(/\D/g, '');

    const studentRes = await queryDb(
      `SELECT s.id, s.registration_no, s.is_active,
              COALESCE(s.name, i.data->>'name', 'Student') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.phone, s.number) AS phone,
              s.number,
              s.recovery_token_expires
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 AND (
         LOWER(s.registration_no) = $2
         OR LOWER(COALESCE(s.email, i.data->>'email')) = $2
         OR LOWER(s.student_unique_id) = $2
         OR s.number = $3
         OR s.phone = $3
         OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(s.phone, s.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
       )
       LIMIT 1`,
      [website.id, cleanLower, raw, digits]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with these credentials, a verification code has been dispatched.',
      });
    }

    const student = studentRes.rows[0];

    const targetPhone = student.phone || student.number;
    const selectedChannel = requestedChannel === 'sms' && targetPhone ? 'sms' : 'email';

    const dispatchLimitCheck = await checkOtpDispatchRateLimit({
      identifier: student.email || student.registration_no,
      phone: targetPhone,
      email: student.email,
      ip: clientIp,
    });

    if (!dispatchLimitCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: dispatchLimitCheck.error },
        { status: 429 }
      );
    }

    const sixDigitCode = generateSecureOtp(6);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await queryDb(
      `UPDATE website_students
       SET recovery_token = $1,
           recovery_token_expires = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND website_id = $4`,
      [sixDigitCode, expiresAt, student.id, website.id]
    );

    await recordOtpDispatch({
      identifier: student.email || student.registration_no,
      phone: targetPhone,
      email: student.email,
      channel: selectedChannel,
      purpose: 'student_recovery',
      ip: clientIp,
    });

    const recoveryUrl = buildStudentRecoveryUrl(website, sixDigitCode, request);
    const institutionName = website.name || 'Institutional Management Portal';

    if (selectedChannel === 'sms') {
      try {
        await sendSms({
          to: targetPhone,
          message: `Your ${institutionName} student password recovery code is: ${sixDigitCode}. Valid for 1 hour.`,
          purpose: 'recovery',
          userId: student.id,
          userType: 'student',
          ip: clientIp,
          websiteId: website.id,
        });
      } catch (smsErr) {
        return NextResponse.json(
          { success: false, error: smsErr.message || 'Failed to dispatch recovery SMS code.' },
          { status: 500 }
        );
      }
    } else {
      if (!student.email) {
        return NextResponse.json(
          { success: false, error: 'No email address registered on your student profile. Please use SMS recovery or contact campus registrar.' },
          { status: 400 }
        );
      }

      try {
        const emailHtml = buildStyledEmail({
          title: 'Student Password Reset Request',
          subtitle: `${institutionName} — Student Services Desk`,
          recipientName: student.name || 'Student',
          bodyParagraphs: [
            'We received a request to reset your student portal account password.',
            'Use the 6-digit verification code below to complete your password update. This security code is valid for 60 minutes.',
            'If you did not request a password reset, you can safely disregard this message.',
          ],
          code: sixDigitCode,
          codeLabel: 'Recovery Passcode',
          actionUrl: recoveryUrl,
          actionText: 'Reset Password Online →',
        });

        await sendEmail({
          to: student.email,
          toName: student.name || 'Student',
          subject: `${institutionName} - Student Account Verification Code [${sixDigitCode}]`,
          html: emailHtml,
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
      message: `Verification code sent to your registered ${selectedChannel === 'sms' ? 'phone number via SMS' : 'email address'}.`,
      channel: selectedChannel,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error processing password recovery.' },
      { status: 500 }
    );
  }
}

async function handlePasswordReset(website, codeOrToken, newPassword) {
  if (!codeOrToken || !newPassword) {
    return NextResponse.json(
      { success: false, error: 'Verification code and new password are required.' },
      { status: 400 }
    );
  }

  if (String(newPassword).length < 6) {
    return NextResponse.json(
      { success: false, error: 'Password must be at least 6 characters in length.' },
      { status: 400 }
    );
  }

  const cleanToken = String(codeOrToken).trim();

  const studentRes = await queryDb(
    `SELECT s.id, s.name, s.email, s.recovery_token_expires
     FROM website_students s
     WHERE s.website_id = $1 AND s.recovery_token = $2
     LIMIT 1`,
    [website.id, cleanToken]
  );

  if (studentRes.rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid or unrecognized recovery verification code.' },
      { status: 404 }
    );
  }

  const student = studentRes.rows[0];

  if (student.recovery_token_expires && new Date(student.recovery_token_expires) < new Date()) {
    return NextResponse.json(
      { success: false, error: 'Verification code has expired. Please request a new code.' },
      { status: 410 }
    );
  }

  const hashedPassword = await hashPassword(String(newPassword).trim());

  await queryDb(
    `UPDATE website_students
     SET password = $1,
         recovery_token = NULL,
         recovery_token_expires = NULL,
         failed_login_attempts = 0,
         locked_until = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND website_id = $3`,
    [hashedPassword, student.id, website.id]
  );

  await revokeAllStudentSessions(website.id, student.id);

  return NextResponse.json({
    success: true,
    message: 'Password reset successfully! You can now log into your student account.',
  });
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
    const rateCheck = checkRateLimit(`student_recovery_put:${clientIp}`, {
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
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const code = body.recovery_token || body.token || body.code;
    const password = body.new_password || body.password;

    return handlePasswordReset(website, code, password);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error resetting password.' },
      { status: 500 }
    );
  }
}

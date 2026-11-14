import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { hashPassword, revokeAllStaffSessions } from 'src/lib/middleware/staff';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { sendSms } from 'src/lib/database/smsSender';
import { getWebsiteUrl } from 'src/lib/database/secret';
import {
  getClientIp,
  inspectMalwareAndAttacks,
  checkRateLimit,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  generateSecureOtp,
} from 'src/lib/security/shield';

function buildStaffRecoveryUrl(website, token, request) {
  const origin = getWebsiteUrl(website, request);
  return `${origin}/auth/access/staff/recovery?token=${encodeURIComponent(token)}`;
}

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

    const attackInspection = await inspectMalwareAndAttacks(request, body);
    if (attackInspection.isBlocked) {
      return NextResponse.json(
        { success: false, error: attackInspection.error },
        { status: attackInspection.status || 403 }
      );
    }

    const ip = getClientIp(request);
    const raw = String(body.identifier || body.email || body.phone || body.number || '').trim();

    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Email address or phone number is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');

    const rateCheck = await checkRateLimit({
      ip,
      identifier: cleanEmail || raw,
      action: 'staff_recovery_request',
      maxAttempts: 5,
      windowSeconds: 600,
      blockDurationSeconds: 1800,
    });

    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error },
        { status: 429 }
      );
    }

    const otpRate = await checkOtpDispatchRateLimit({
      identifier: cleanEmail || raw,
      phone: phoneDigits,
      email: cleanEmail,
      ip,
    });

    if (!otpRate.isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: otpRate.error,
          waitSeconds: otpRate.waitSeconds,
          remainingMinutes: otpRate.remainingMinutes,
        },
        { status: 429 }
      );
    }

    const staffRes = await queryDb(
      `SELECT ws.id, ws.name, ws.email, ws.number, COALESCE(ws.phone, ws.number) AS phone,
              ws.is_active, ws.recovery_token_expires
       FROM website_staffs ws
       WHERE ws.website_id = $1 
         AND (
           LOWER(ws.email) = $2 
           OR ws.number = $3 
           OR ws.phone = $3 
           OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(ws.phone, ws.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
         )
       LIMIT 1`,
      [website.id, cleanEmail, raw, phoneDigits]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No staff account found with this email or phone number on this campus.' },
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

    const generatedToken = generateSecureOtp(6);

    await queryDb(
      `UPDATE website_staffs
       SET recovery_token = $1, 
           recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [generatedToken, staff.id]
    );

    const channel = String(body.channel || 'email').toLowerCase() === 'sms' ? 'sms' : 'email';
    const recoveryUrl = buildStaffRecoveryUrl(website, generatedToken, request);

    await recordOtpDispatch({
      identifier: raw,
      phone: staff.phone || staff.number,
      email: staff.email,
      channel,
      purpose: 'staff_recovery',
      ip,
    });

    if (channel === 'sms') {
      const targetPhone = staff.phone || staff.number;
      if (!targetPhone) {
        return NextResponse.json(
          { success: false, error: 'No phone number registered for SMS recovery on this staff account.' },
          { status: 400 }
        );
      }

      try {
        await sendSms({
          to: targetPhone,
          message: `Your ${website.name} staff password recovery code is: ${generatedToken}. Valid for 60 minutes.`,
          purpose: 'recovery',
          userId: staff.id,
          userType: 'staff',
          ip,
          websiteId: website.id,
        });
      } catch (smsErr) {
        return NextResponse.json(
          { success: false, error: smsErr.message || 'Failed to dispatch recovery SMS code.' },
          { status: 500 }
        );
      }
    } else {
      try {
        const html = buildStyledEmail({
          title: 'Staff Password Recovery',
          subtitle: `${website.name} — Staff Operations Portal`,
          recipientName: staff.name,
          bodyParagraphs: [
            'We received a request to reset the password for your staff account.',
            'Enter the 6-digit recovery code on the reset screen, or click the direct link below. This code is active for 1 hour.',
            'If you did not make this request, you can safely ignore this email; your existing credentials remain secure.',
          ],
          code: generatedToken,
          codeLabel: 'Password Recovery Code',
          actionUrl: recoveryUrl,
          actionText: 'Reset Staff Password →',
        });

        await sendEmail({
          to: staff.email,
          toName: staff.name,
          subject: `${website.name} - Staff Password Recovery Code`,
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
      message: `Password recovery code sent via ${channel === 'sms' ? 'SMS' : 'email'}. Please check your ${channel === 'sms' ? 'phone messages' : 'inbox'}.`,
      channel,
      hasPhone: Boolean(staff.phone || staff.number),
      hasEmail: Boolean(staff.email),
    });
  } catch (error) {
    console.error('Error during staff recovery request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during password recovery request.' },
      { status: 500 }
    );
  }
}

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

    const attackInspection = await inspectMalwareAndAttacks(request, body);
    if (attackInspection.isBlocked) {
      return NextResponse.json(
        { success: false, error: attackInspection.error },
        { status: attackInspection.status || 403 }
      );
    }

    const ip = getClientIp(request);
    const { token } = body;
    const newPassword = body.password || body.newPassword;
    const raw = String(body.identifier || body.email || body.phone || body.number || '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Password recovery code or token is required.' },
        { status: 400 }
      );
    }

    const resetRate = await checkRateLimit({
      ip,
      identifier: String(token).trim(),
      action: 'staff_reset_pw',
      maxAttempts: 5,
      windowSeconds: 600,
      blockDurationSeconds: 900,
    });

    if (!resetRate.isAllowed) {
      return NextResponse.json(
        { success: false, error: resetRate.error },
        { status: 429 }
      );
    }

    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters in length.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim();
    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');

    let queryText = `
      SELECT id, name, recovery_token_expires
      FROM website_staffs
      WHERE website_id = $1 AND recovery_token = $2
    `;
    const queryParams = [website.id, cleanToken];

    if (raw) {
      queryText += ` AND (
        LOWER(email) = $3 
        OR number = $4 
        OR phone = $4 
        OR (LENGTH($5) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(phone, number, ''), '\\D', '', 'g'), 10) = RIGHT($5, 10))
      )`;
      queryParams.push(cleanEmail, raw, phoneDigits);
    }

    queryText += ' LIMIT 1';

    const staffRes = await queryDb(queryText, queryParams);

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized recovery code.' },
        { status: 404 }
      );
    }

    const staff = staffRes.rows[0];

    if (staff.recovery_token_expires && new Date(staff.recovery_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This password recovery code has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(String(newPassword).trim());

    await queryDb(
      `UPDATE website_staffs
       SET password = $1, 
           recovery_token = NULL, 
           recovery_token_expires = NULL, 
           failed_login_attempts = 0,
           locked_until = NULL,
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, staff.id]
    );

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

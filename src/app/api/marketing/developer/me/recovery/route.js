import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hashPassword } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { SITE_NAME, getBaseUrl } from 'src/lib/database/secret';
import {
  getClientIp,
  inspectMalwareAndAttacks,
  checkRateLimit,
  enforceOtpCooldown,
  generateSecureOtp,
} from 'src/lib/security/shield';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const attackInspection = await inspectMalwareAndAttacks(request, body);
    if (attackInspection.isBlocked) {
      return NextResponse.json(
        { success: false, error: attackInspection.error },
        { status: attackInspection.status || 403 }
      );
    }

    const ip = getClientIp(request);
    const { action = 'request_token', token, newPassword } = body;
    const raw = String(body.identifier || body.email || body.phone || '').trim();

    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Email or phone number is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');

    if (action === 'reset_password' || (token && newPassword)) {
      const resetRate = await checkRateLimit({
        ip,
        identifier: cleanEmail,
        action: 'dev_reset_pw',
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

      if (!token || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Token and new password are required.' },
          { status: 400 }
        );
      }

      if (String(newPassword).length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      const adminRes = await queryDb(
        `SELECT * FROM developers 
         WHERE (LOWER(email) = $1 
            OR phone = $2 
            OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10)))
           AND recovery_token = $4 
           AND recovery_token_expires > CURRENT_TIMESTAMP 
         LIMIT 1`,
        [cleanEmail, raw, phoneDigits, token.trim()]
      );

      if (adminRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired recovery token.' },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(newPassword.trim());
      await queryDb(
        `UPDATE developers 
         SET password = $1, 
             recovery_token = NULL, 
             recovery_token_expires = NULL,
             verification_token = NULL,
             verification_token_expires = NULL,
             two_factor_code = NULL,
             two_factor_expires = NULL,
             failed_login_attempts = 0,
             locked_until = NULL,
             email_verified = TRUE,
             is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [hashedPassword, adminRes.rows[0].id]
      );

      try {
        await queryDb('UPDATE developer_login_sessions SET is_active = FALSE WHERE developer_id = $1', [adminRes.rows[0].id]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully. You may now login.',
      });
    }

    const rateCheck = await checkRateLimit({
      ip,
      identifier: cleanEmail,
      action: 'dev_recovery_request',
      maxAttempts: 3,
      windowSeconds: 600,
      blockDurationSeconds: 1800,
    });

    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error },
        { status: 429 }
      );
    }

    const cooldownCheck = await enforceOtpCooldown({
      ip,
      identifier: cleanEmail,
      action: 'dev_recovery',
      minIntervalSeconds: 60,
      maxPerHour: 5,
    });

    if (!cooldownCheck.isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: cooldownCheck.error,
          waitSeconds: cooldownCheck.waitSeconds,
        },
        { status: 429 }
      );
    }

    const dbAdmin = await queryDb(
      `SELECT * FROM developers 
       WHERE LOWER(email) = $1 
          OR phone = $2 
          OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
       LIMIT 1`,
      [cleanEmail, raw, phoneDigits]
    );

    if (dbAdmin.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No developer account found with this email or phone number.' },
        { status: 404 }
      );
    }

    const admin = dbAdmin.rows[0];
    const targetEmail = admin.email;
    const generatedToken = generateSecureOtp(6);

    await queryDb(
      `UPDATE developers 
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [generatedToken, admin.id]
    );

    const baseUrl = getBaseUrl(request);
    const resetUrl = `${baseUrl}/developer-auth/recovery?token=${generatedToken}&email=${encodeURIComponent(targetEmail)}`;

    try {
      const emailHtml = buildStyledEmail({
        title: 'Developer Security Recovery Token',
        subtitle: 'Password reset authorization',
        recipientName: admin.name || 'Developer',
        bodyParagraphs: [
          'You requested a security recovery token for your administrator account.',
          'Please enter the token below or click the direct link to set your new password.'
        ],
        code: generatedToken,
        codeLabel: 'Recovery Token',
        actionUrl: resetUrl,
        actionText: 'Reset Password Instantly',
        footerNote: 'This token is valid for 60 minutes. Keep it confidential and do not share it with anyone.'
      });

      await sendEmail({
        to: targetEmail,
        subject: `Developer Security Recovery Token - ${SITE_NAME}`,
        html: emailHtml,
        text: `Your security recovery token is: ${generatedToken}.\nReset link: ${resetUrl}\nValid for 60 minutes.`,
      });
    } catch (mailErr) {
      console.warn('Brevo email notice:', mailErr.message);
    }

    const maskedEmail = targetEmail.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
      return first + '*'.repeat(Math.max(middle.length, 3)) + domain;
    });

    return NextResponse.json({
      success: true,
      message: `A security recovery token has been sent to your registered email (${maskedEmail}).`,
      email: targetEmail,
      cooldownSeconds: 60,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing recovery request.' },
      { status: 500 }
    );
  }
}

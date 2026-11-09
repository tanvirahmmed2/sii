import { NextResponse } from 'next/server';
import { generateRandomHex } from 'src/lib/utils/random';
import { queryDb } from 'src/lib/database/db';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { sendSms } from 'src/lib/database/smsSender';
import { SITE_NAME, getBaseUrl } from 'src/lib/database/secret';
import {
  getClientIp,
  inspectMalwareAndAttacks,
  checkRateLimit,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
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
    const raw = String(body.email || body.identifier || body.phone || '').trim();
    const channel = String(body.channel || 'email').toLowerCase() === 'sms' ? 'sms' : 'email';

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
      identifier: cleanEmail,
      action: 'dev_resend_code',
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
      identifier: cleanEmail,
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

    const adminRes = await queryDb(
      `SELECT id, name, email, phone, is_active, email_verified 
       FROM developers 
       WHERE LOWER(email) = $1 
          OR phone = $2 
          OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
       LIMIT 1`,
      [cleanEmail, raw, phoneDigits]
    );

    if (adminRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No developer account found for this email address or phone number.' },
        { status: 404 }
      );
    }

    const admin = adminRes.rows[0];

    if (!admin.is_active) {
      return NextResponse.json(
        { success: false, error: 'This developer account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    if (admin.email_verified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Your developer account is already verified! You can login immediately.',
      });
    }

    const newToken = generateRandomHex(32);
    const newCode = generateSecureOtp(6);

    await queryDb(
      `UPDATE developers 
       SET verification_token = $1,
           verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours',
           two_factor_code = $2,
           two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [newToken, newCode, admin.id]
    );

    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/developer-auth/verify?token=${newToken}&email=${encodeURIComponent(admin.email)}`;

    if (channel === 'sms') {
      if (!admin.phone) {
        return NextResponse.json(
          { success: false, error: 'No mobile phone number found for this account.' },
          { status: 400 }
        );
      }

      try {
        await sendSms({
          to: admin.phone,
          message: `Your ${SITE_NAME} Developer verification code is: ${newCode}. Enter this code or visit ${verifyUrl}`,
          purpose: 'verification',
          userId: admin.id,
          userType: 'developer',
          ip,
        });

        await recordOtpDispatch({
          identifier: admin.phone,
          phone: admin.phone,
          email: admin.email,
          channel: 'sms',
          purpose: 'verification',
          ip,
        });
      } catch (smsErr) {
        return NextResponse.json(
          { success: false, error: `Failed to dispatch SMS: ${smsErr.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'A new verification code has been dispatched via SMS to your registered mobile phone.',
        channel: 'sms',
        cooldownSeconds: 60,
      });
    }

    try {
      const emailHtml = buildStyledEmail({
        title: `${SITE_NAME} Developer Portal`,
        subtitle: 'Account Verification Link',
        recipientName: admin.name || 'Developer',
        bodyParagraphs: [
          'You requested a new verification link for your platform administrator account.',
          'Click the link below or enter code ' + newCode + ' to activate your account.'
        ],
        code: newCode,
        codeLabel: 'Verification Code',
        actionText: 'Verify & Activate Account',
        actionUrl: verifyUrl,
        footerNote: 'This link and code will expire in 24 hours. Do not share it with anyone.'
      });

      await sendEmail({
        to: admin.email,
        subject: `Developer Verification Link - ${SITE_NAME}`,
        html: emailHtml,
        text: `Hello ${admin.name},\n\nYour new developer verification link is:\n${verifyUrl}\nCode: ${newCode}\n\nExpires in 24 hours.`,
      });

      await recordOtpDispatch({
        identifier: admin.email,
        phone: admin.phone,
        email: admin.email,
        channel: 'email',
        purpose: 'verification',
        ip,
      });
    } catch (mailErr) {
      return NextResponse.json(
        { success: false, error: `Failed to send verification email: ${mailErr.message || 'Email delivery failed'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'A new verification activation link has been dispatched to your email.',
      channel: 'email',
      cooldownSeconds: 60,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing request.' },
      { status: 500 }
    );
  }
}

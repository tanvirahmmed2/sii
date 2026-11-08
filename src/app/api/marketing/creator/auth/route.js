import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { SITE_NAME, CREATOR_TOKEN, getBaseUrl } from 'src/lib/database/secret';
import {
  authenticateCreator,
  getCreatorSession,
  clearCreatorSessionCookie,
  setCreatorSessionCookie,
  generateToken,
  hashPassword,
} from 'src/lib/middleware/creator';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import {
  getClientIp,
  getUserAgent,
  inspectMalwareAndAttacks,
  checkRateLimit,
  enforceOtpCooldown,
  generateSecureOtp,
  sanitizeInput,
} from 'src/lib/security/shield';

export async function handleAuthAction(body, request) {
  const attackCheck = await inspectMalwareAndAttacks(request, body);
  if (attackCheck.isBlocked) {
    return NextResponse.json(
      { success: false, error: attackCheck.error },
      { status: attackCheck.status || 403 }
    );
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const { action } = body;

  if (action === 'register') {
    const d = body.creatorData || body;

    if (d.hp_website || d.company_fax || d.bot_trap) {
      return NextResponse.json({
        success: true,
        message: 'Account registered successfully! A 6-digit verification code has been sent to your email.',
        creator: { id: 0, name: sanitizeInput(d.name), email: sanitizeInput(d.email), emailVerified: false },
      });
    }

    if (d.reg_timestamp && Date.now() - Number(d.reg_timestamp) < 800) {
      return NextResponse.json(
        { success: false, error: 'Registration submitted too quickly. Please try again.' },
        { status: 429 }
      );
    }

    const rateCheck = await checkRateLimit({
      ip,
      action: 'creator_register',
      maxAttempts: 3,
      windowSeconds: 3600,
      blockDurationSeconds: 3600,
    });

    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error },
        { status: 429 }
      );
    }

    if (!d.name || !d.email || !d.password || !d.phone) {
      return NextResponse.json({ success: false, error: 'Name, email, phone number, and password are required.' }, { status: 400 });
    }

    const cleanName = sanitizeInput(d.name);
    const cleanEmail = sanitizeInput(d.email).toLowerCase();
    const cleanPhone = sanitizeInput(d.phone);

    if (cleanName.length < 2 || cleanName.length > 100) {
      return NextResponse.json({ success: false, error: 'Name must be between 2 and 100 characters.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (cleanPhone.length < 5 || cleanPhone.length > 30) {
      return NextResponse.json({ success: false, error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    if (String(d.password).length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const phoneDigits = cleanPhone.replace(/\D/g, '');

    const existing = await queryDb(
      `SELECT id, email, phone FROM creators 
       WHERE LOWER(email) = $1 
          OR phone = $2 
          OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
       LIMIT 1`,
      [cleanEmail, cleanPhone, phoneDigits]
    );

    if (existing.rows.length > 0) {
      const ex = existing.rows[0];
      if (ex.email && ex.email.toLowerCase() === cleanEmail) {
        return NextResponse.json({
          success: false,
          error: 'An account with this email already exists. Please log in.',
          registeredWithPassword: true,
        }, { status: 409 });
      }
      return NextResponse.json({
        success: false,
        error: 'An account with this phone number already exists. Please log in.',
        registeredWithPassword: true,
      }, { status: 409 });
    }

    const hashedPassword = await hashPassword(d.password);
    const verificationCode = generateSecureOtp(6);
    const country = sanitizeInput(d.country) || null;
    const city = sanitizeInput(d.city) || null;
    const address = sanitizeInput(d.address) || null;

    const res = await queryDb(
      `INSERT INTO creators (name, email, password, phone, country, city, address, email_verified, verification_token, verification_token_expires, is_active, failed_login_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE, 0)
       RETURNING id, name, email, phone, email_verified, is_active, created_at`,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
        cleanPhone,
        country,
        city,
        address,
        verificationCode,
      ]
    );

    const newCreator = res.rows[0];
    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/creator/verify?token=${verificationCode}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      await sendEmail({
        to: cleanEmail,
        subject: `Your Verification Code: ${verificationCode} - ${SITE_NAME}`,
        html: buildStyledEmail({
          title: `Welcome to ${SITE_NAME}`,
          subtitle: 'Creator Account Verification',
          recipientName: newCreator.name,
          bodyParagraphs: [
            'Thank you for joining our platform. Use the verification token below to activate your creator account.',
          ],
          code: verificationCode,
          codeLabel: 'Verification Token',
          actionUrl: verifyUrl,
          actionText: 'Verify Account Instantly',
          footerNote: 'This verification token and link will expire in 24 hours. If you did not create an account, please ignore this email.',
        }),
        text: `Hello ${newCreator.name},\n\nYour ${SITE_NAME} creator verification code is: ${verificationCode}\n\nOr verify directly at:\n${verifyUrl}\n\nExpires in 24 hours.`,
      });
    } catch (mailErr) {
      console.warn('Notice sending creator verification email via Brevo:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully! A 6-digit verification code has been sent to your email.',
      creator: {
        id: newCreator.id,
        name: newCreator.name,
        email: newCreator.email,
        emailVerified: false,
      },
    });
  }

  if (action === 'verify') {
    const { token, code, email, identifier, phone } = body;
    const candidateCode = String(code || token || '').trim();
    const raw = String(email || identifier || phone || '').trim();

    if (!candidateCode || !raw) {
      return NextResponse.json({ success: false, error: 'Verification code and email or phone number are required.' }, { status: 400 });
    }

    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');

    const rateCheck = await checkRateLimit({
      ip,
      identifier: cleanEmail,
      action: 'creator_verify',
      maxAttempts: 5,
      windowSeconds: 600,
      blockDurationSeconds: 900,
    });

    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error },
        { status: 429 }
      );
    }

    const res = await queryDb(
      `SELECT id, name, email, email_verified, verification_token, verification_token_expires 
       FROM creators 
       WHERE LOWER(email) = $1 
          OR phone = $2 
          OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
       LIMIT 1`,
      [cleanEmail, raw, phoneDigits]
    );

    const creator = res.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator account not found.' }, { status: 404 });
    }

    if (creator.email_verified === true) {
      return NextResponse.json({
        success: true,
        message: 'Your account is already verified! You can log in directly.',
        alreadyVerified: true,
        creator: {
          id: creator.id,
          name: creator.name,
          email: creator.email,
          emailVerified: true,
        },
      });
    }

    if (!creator.verification_token || creator.verification_token.trim() !== candidateCode) {
      return NextResponse.json({ success: false, error: 'Invalid verification code.' }, { status: 400 });
    }

    if (creator.verification_token_expires && new Date(creator.verification_token_expires) < new Date()) {
      return NextResponse.json({ success: false, error: 'This verification code has expired. Please request a new code.', expired: true }, { status: 400 });
    }

    await queryDb(
      `UPDATE creators 
       SET email_verified = TRUE, 
           verification_token = NULL, 
           verification_token_expires = NULL, 
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [creator.id]
    );

    const sessionToken = generateToken(
      { id: Number(creator.id), email: creator.email, role: 'creator', type: 'creator' },
      '7d'
    );

    await queryDb(
      `INSERT INTO creator_login_sessions (creator_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [creator.id, sessionToken, ip, userAgent]
    ).catch(() => {});

    await queryDb(
      `INSERT INTO creator_login_activities (creator_id, ip_address, user_agent, status)
       VALUES ($1, $2, $3, 'Success')`,
      [creator.id, ip, userAgent]
    ).catch(() => {});

    const resp = NextResponse.json({
      success: true,
      message: 'Your creator account has been successfully verified! You are now logged in.',
      creator: {
        id: Number(creator.id),
        name: creator.name,
        email: creator.email,
        emailVerified: true,
        isVerified: true,
      },
      token: sessionToken,
    });

    await setCreatorSessionCookie(resp, sessionToken);
    return resp;
  }

  if (action === 'resend_verification') {
    const raw = String(body.email || body.identifier || body.phone || '').trim();
    if (!raw) {
      return NextResponse.json({ success: false, error: 'Email address or phone number is required.' }, { status: 400 });
    }

    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');

    const rateCheck = await checkRateLimit({
      ip,
      identifier: cleanEmail,
      action: 'creator_resend_otp',
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
      action: 'creator_resend',
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

    const res = await queryDb(
      `SELECT id, name, email, is_active, email_verified FROM creators 
       WHERE LOWER(email) = $1 
          OR phone = $2 
          OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
       LIMIT 1`,
      [cleanEmail, raw, phoneDigits]
    );

    const creator = res.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator account not found with this email or phone number.' }, { status: 404 });
    }

    if (creator.is_active === false) {
      return NextResponse.json({ success: false, error: 'This account has been deactivated.' }, { status: 403 });
    }

    if (creator.email_verified === true) {
      return NextResponse.json({ success: true, message: 'This account is already verified! You can log in directly.', alreadyVerified: true });
    }

    const newCode = generateSecureOtp(6);
    await queryDb(
      `UPDATE creators 
       SET verification_token = $1, verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newCode, creator.id]
    );

    const targetEmail = creator.email;
    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/creator/verify?token=${newCode}&email=${encodeURIComponent(targetEmail)}`;

    try {
      await sendEmail({
        to: targetEmail,
        subject: `Your Verification Code: ${newCode} - ${SITE_NAME}`,
        html: buildStyledEmail({
          title: 'Verify Your Creator Account',
          subtitle: `${SITE_NAME} Security Verification`,
          recipientName: creator.name,
          bodyParagraphs: [
            'Here is your new verification token to activate your creator account.',
          ],
          code: newCode,
          codeLabel: 'Verification Token',
          actionUrl: verifyUrl,
          actionText: 'Verify Account Instantly',
          footerNote: 'This verification token and link will expire in 24 hours. If you did not request this, please ignore this email.',
        }),
        text: `Hello ${creator.name},\n\nYour new verification code is: ${newCode}\n\nOr verify at:\n${verifyUrl}\n\nExpires in 24 hours.`,
      });
    } catch (mailErr) {
      console.warn('Notice resending creator verification email:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      cooldownSeconds: 60,
    });
  }

  if (action === 'login') {
    const identifier = (body.identifier || body.email || body.phone || '').trim();
    const { password, twoFactorCode } = body;

    const rateCheck = await checkRateLimit({
      ip,
      identifier,
      action: 'creator_login',
      maxAttempts: 5,
      windowSeconds: 900,
      blockDurationSeconds: 900,
    });

    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateCheck.error,
          rateLimited: true,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds || 900) } }
      );
    }

    try {
      const result = await authenticateCreator(identifier, password, { ip, userAgent, twoFactorCode });
      const response = NextResponse.json({
        success: true,
        creator: result.creator,
        token: result.token,
        message: 'Logged in successfully.',
      });

      await setCreatorSessionCookie(response, result.token);
      return response;
    } catch (authErr) {
      return NextResponse.json(
        {
          success: false,
          error: authErr.message || 'Authentication failed.',
          twoFactorRequired: Boolean(authErr.twoFactorRequired || authErr.requires2FA),
          requires2FA: Boolean(authErr.requires2FA || authErr.twoFactorRequired),
          twoFactorInvalid: Boolean(authErr.twoFactorInvalid),
          unverified: Boolean(authErr.unverified),
          deactivated: Boolean(authErr.deactivated),
          locked: Boolean(authErr.locked),
          remainingMinutes: authErr.remainingMinutes,
          email: authErr.email || undefined,
        },
        { status: authErr.locked ? 429 : authErr.unverified || authErr.deactivated ? 403 : authErr.status || 401 }
      );
    }
  }

  if (action === 'logout') {
    const token =
      request?.cookies?.get?.(CREATOR_TOKEN)?.value ||
      request?.headers?.get?.('authorization')?.replace('Bearer ', '');

    if (token) {
      await queryDb(
        `UPDATE creator_login_sessions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE token = $1`,
        [token]
      ).catch(() => {});
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    await clearCreatorSessionCookie(response);
    return response;
  }

  if (action === 'me') {
    const current = await getCreatorSession(request);
    if (!current) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ success: true, creator: current });
  }

  if (action === 'recover') {
    const raw = String(body.identifier || body.email || body.phone || '').trim();
    if (!raw) {
      return NextResponse.json({ success: false, error: 'Email address or phone number is required.' }, { status: 400 });
    }

    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');

    const rateCheck = await checkRateLimit({
      ip,
      identifier: cleanEmail,
      action: 'creator_recovery_request',
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
      action: 'creator_recovery',
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

    const recoveryCode = generateSecureOtp(6);

    const res = await queryDb(
      `UPDATE creators 
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour', updated_at = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT id FROM creators 
         WHERE LOWER(email) = $2 
            OR phone = $3 
            OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($4, 10))
         LIMIT 1
       )
       RETURNING id, name, email, phone`,
      [recoveryCode, cleanEmail, raw, phoneDigits]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No creator account found with this email or phone number.' }, { status: 404 });
    }

    const creator = res.rows[0];
    const targetEmail = creator.email;
    const baseUrl = getBaseUrl(request);
    const resetUrl = `${baseUrl}/creator/recovery?token=${recoveryCode}&email=${encodeURIComponent(targetEmail)}`;

    try {
      await sendEmail({
        to: targetEmail,
        subject: `Your Password Reset Code: ${recoveryCode} - ${SITE_NAME}`,
        html: buildStyledEmail({
          title: 'Password Reset Request',
          subtitle: `${SITE_NAME} Security Recovery`,
          recipientName: creator.name,
          bodyParagraphs: [
            `You requested to reset your password on ${SITE_NAME}. Use the security recovery token below or click the reset link to set your new password:`,
          ],
          code: recoveryCode,
          codeLabel: 'Recovery Token',
          actionUrl: resetUrl,
          actionText: 'Reset Password Instantly',
          footerNote: 'This recovery token and link will expire in 1 hour. If you did not request a password reset, please ignore this email.',
        }),
        text: `Hello ${creator.name},\n\nYour ${SITE_NAME} password reset code is: ${recoveryCode}\n\nOr reset directly at:\n${resetUrl}\n\nExpires in 1 hour.`,
      });
    } catch (mailErr) {
      console.warn('Notice sending creator reset email:', mailErr.message);
    }

    const maskedEmail = targetEmail.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
      return first + '*'.repeat(Math.max(middle.length, 3)) + domain;
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit password reset code has been sent to your email (${maskedEmail}).`,
      email: targetEmail,
      cooldownSeconds: 60,
    });
  }

  if (action === 'reset_password') {
    const { email, identifier, phone, code, token, newPassword } = body;
    const recoveryCode = String(code || token || '').trim();
    const raw = String(email || identifier || phone || '').trim();

    if (!raw || !recoveryCode || !newPassword) {
      return NextResponse.json({ success: false, error: 'Email or phone number, recovery code, and new password are required.' }, { status: 400 });
    }

    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');

    const rateCheck = await checkRateLimit({
      ip,
      identifier: cleanEmail,
      action: 'creator_reset_pw',
      maxAttempts: 5,
      windowSeconds: 600,
      blockDurationSeconds: 900,
    });

    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error },
        { status: 429 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const res = await queryDb(
      `SELECT id, name, email, recovery_token, recovery_token_expires 
       FROM creators 
       WHERE LOWER(email) = $1 
          OR phone = $2 
          OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
       LIMIT 1`,
      [cleanEmail, raw, phoneDigits]
    );

    const creator = res.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator account not found.' }, { status: 404 });
    }

    if (!creator.recovery_token || creator.recovery_token.trim() !== recoveryCode) {
      return NextResponse.json({ success: false, error: 'Invalid reset code. Please check the code in your email.' }, { status: 400 });
    }

    if (creator.recovery_token_expires && new Date(creator.recovery_token_expires) < new Date()) {
      return NextResponse.json({ success: false, error: 'This reset code has expired. Please request a new one.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await queryDb(
      `UPDATE creators 
       SET password = $1, 
           recovery_token = NULL, 
           recovery_token_expires = NULL, 
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [hashedPassword, creator.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.',
    });
  }

  return NextResponse.json({ success: false, error: `Unknown auth action: ${action}` }, { status: 400 });
}

export async function GET(request) {
  try {
    const current = await getCreatorSession(request);
    if (!current) {
      return NextResponse.json({ success: false, creator: null, error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ success: true, creator: current });
  } catch (error) {
    return NextResponse.json({ success: false, creator: null, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    return await handleAuthAction(body, request);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

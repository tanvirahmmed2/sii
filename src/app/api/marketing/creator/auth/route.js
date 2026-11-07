import { NextResponse } from 'next/server';
import { generateRandomCode, generateToken as generateAlphanumericToken } from 'src/lib/utils/random';
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

export async function handleAuthAction(body, request) {
  const { action } = body;

  if (action === 'register') {
    const d = body.creatorData || body;
    if (!d.name || !d.email || !d.password || !d.phone) {
      return NextResponse.json({ success: false, error: 'Name, email, phone number, and password are required.' }, { status: 400 });
    }

    const cleanEmail = String(d.email).trim().toLowerCase();
    const cleanPhone = String(d.phone).trim();
    if (cleanPhone.length < 5) {
      return NextResponse.json({ success: false, error: 'Please enter a valid phone number.' }, { status: 400 });
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
    const verificationCode = generateAlphanumericToken(6);
    const phone = cleanPhone;
    const country = (d.country || '').trim() || null;
    const city = (d.city || '').trim() || null;
    const address = (d.address || '').trim() || null;

    const res = await queryDb(
      `INSERT INTO creators (name, email, password, phone, country, city, address, email_verified, verification_token, verification_token_expires, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE)
       RETURNING id, name, email, phone, email_verified, is_active, created_at`,
      [
        d.name.trim(),
        cleanEmail,
        hashedPassword,
        phone,
        country,
        city,
        address,
        verificationCode,
      ]
    );

    const newCreator = res.rows[0];

    console.log(`[CREATOR REGISTRATION] Account created: ${cleanEmail}. Verification Code: ${verificationCode}`);

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
       SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [creator.id]
    );

    const sessionToken = generateToken(
      { id: Number(creator.id), email: cleanEmail, role: 'creator', type: 'creator' },
      '7d'
    );

    const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || '127.0.0.1';
    const userAgent = request?.headers?.get('user-agent') || 'Unknown';

    await queryDb(
      `INSERT INTO creator_login_sessions (creator_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [creator.id, sessionToken, ip, userAgent]
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

    const newCode = generateAlphanumericToken(6);
    await queryDb(
      `UPDATE creators 
       SET verification_token = $1, verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newCode, creator.id]
    );

    const targetEmail = creator.email;
    console.log(`[CREATOR RESEND] New verification code for ${targetEmail}: ${newCode}`);

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
    });
  }

  if (action === 'login') {
    const identifier = (body.identifier || body.email || body.phone || '').trim();
    const { password, twoFactorCode } = body;
    const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || '127.0.0.1';
    const userAgent = request?.headers?.get('user-agent') || 'Unknown';

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
          twoFactorRequired: Boolean(authErr.twoFactorRequired),
          twoFactorInvalid: Boolean(authErr.twoFactorInvalid),
          unverified: Boolean(authErr.unverified),
          deactivated: Boolean(authErr.deactivated),
          email: authErr.email || undefined,
        },
        { status: authErr.status || 401 }
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
    const recoveryCode = generateAlphanumericToken(6);

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

    console.log(`[CREATOR RECOVERY] Password reset code for ${targetEmail}: ${recoveryCode}`);

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
    });
  }

  if (action === 'reset_password') {
    const { email, identifier, phone, code, token, newPassword } = body;
    const recoveryCode = String(code || token || '').trim();
    const raw = String(email || identifier || phone || '').trim();

    if (!raw || !recoveryCode || !newPassword) {
      return NextResponse.json({ success: false, error: 'Email or phone number, recovery code, and new password are required.' }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const cleanEmail = raw.toLowerCase();
    const phoneDigits = raw.replace(/\D/g, '');
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
       SET password = $1, recovery_token = NULL, recovery_token_expires = NULL, updated_at = CURRENT_TIMESTAMP 
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
    console.error('Auth GET API error:', error);
    return NextResponse.json({ success: false, creator: null, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return await handleAuthAction(body, request);
  } catch (error) {
    console.error('Auth POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

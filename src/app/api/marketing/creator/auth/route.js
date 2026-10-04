import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db';
import { SITE_NAME, CREATOR_TOKEN } from 'src/lib/database/secret';
import {
  authenticateCreator,
  getCreatorSession,
  clearCreatorSessionCookie,
  setCreatorSessionCookie,
  generateToken,
  hashPassword,
} from 'src/lib/middleware/creator';
import { sendEmail } from 'src/lib/database/brevo';

/**
 * API Route: /api/creator/auth
 * Dedicated to `creators` table authentication, verification, recovery, and session management.
 * Strictly adhering to schema.psql.
 */

export async function handleAuthAction(body, request) {
  const { action } = body;

  // 1. Register Creator
  if (action === 'register') {
    const d = body.creatorData || body;
    if (!d.name || !d.email || !d.password) {
      return NextResponse.json({ success: false, error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = String(d.email).trim().toLowerCase();
    const existing = await queryDb('SELECT id FROM creators WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(d.password);
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const institution = (d.institution || d.company || '').trim() || null;
    const phone = (d.phone || '').trim() || null;
    const country = (d.country || '').trim() || null;
    const city = (d.city || '').trim() || null;
    const address = (d.address || '').trim() || null;

    const res = await queryDb(
      `INSERT INTO creators (name, email, password, phone, institution, country, city, address, email_verified, verification_token, verification_token_expires, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE)
       RETURNING id, name, email, phone, institution, email_verified, is_active, created_at`,
      [
        d.name.trim(),
        cleanEmail,
        hashedPassword,
        phone,
        institution,
        country,
        city,
        address,
        verificationCode,
      ]
    );

    const newCreator = res.rows[0];

    console.log(`[CREATOR REGISTRATION] Account created: ${cleanEmail}. Verification Code: ${verificationCode}`);

    const origin =
      request?.headers?.get('origin') ||
      (request?.headers?.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        : '') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const verifyUrl = `${origin}/creator/verify?token=${verificationCode}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      await sendEmail({
        to: cleanEmail,
        subject: `Your Verification Code: ${verificationCode} - ${SITE_NAME}`,
        html: `
          <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Welcome to ${SITE_NAME}, ${newCreator.name}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              Thank you for joining our platform. Use the 6-digit verification code below to activate your creator account:
            </p>
            <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${verificationCode}</span>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${verifyUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block;">
                Or Click Here to Verify Instantly →
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
              This code and link will expire in 24 hours. If you did not create an account, please ignore this email.
            </p>
          </div>
        `,
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
        institution: newCreator.institution,
        emailVerified: false,
      },
      verificationCode,
    });
  }

  // 2. Verify Email
  if (action === 'verify') {
    const { token, code, email } = body;
    const candidateCode = String(code || token || '').trim();

    if (!candidateCode || !email) {
      return NextResponse.json({ success: false, error: 'Verification code and email are required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const res = await queryDb(
      `SELECT id, name, email, institution, email_verified, verification_token, verification_token_expires 
       FROM creators WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
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
          institution: creator.institution,
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

    // Mark creator as verified adhering to schema.psql email_verified column
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
        institution: creator.institution,
        emailVerified: true,
        isVerified: true,
      },
      token: sessionToken,
    });

    await setCreatorSessionCookie(resp, sessionToken);
    return resp;
  }

  // 3. Resend Verification
  if (action === 'resend_verification') {
    const { email } = body;
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const res = await queryDb(
      'SELECT id, name, email, is_active, email_verified FROM creators WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );

    const creator = res.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator account not found with this email.' }, { status: 404 });
    }

    if (creator.is_active === false) {
      return NextResponse.json({ success: false, error: 'This account has been deactivated.' }, { status: 403 });
    }

    if (creator.email_verified === true) {
      return NextResponse.json({ success: true, message: 'This account is already verified! You can log in directly.', alreadyVerified: true });
    }

    const newCode = crypto.randomInt(100000, 999999).toString();
    await queryDb(
      `UPDATE creators 
       SET verification_token = $1, verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newCode, creator.id]
    );

    console.log(`[CREATOR RESEND] New verification code for ${cleanEmail}: ${newCode}`);

    const origin =
      request?.headers?.get('origin') ||
      (request?.headers?.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        : '') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const verifyUrl = `${origin}/creator/verify?token=${newCode}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      await sendEmail({
        to: cleanEmail,
        subject: `Your Verification Code: ${newCode} - ${SITE_NAME}`,
        html: `
          <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Verify Your Creator Account</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              Hello ${creator.name}, here is your new verification code:
            </p>
            <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${newCode}</span>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${verifyUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block;">
                Or Click Here to Verify Instantly →
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
              This code will expire in 24 hours.
            </p>
          </div>
        `,
        text: `Hello ${creator.name},\n\nYour new verification code is: ${newCode}\n\nOr verify at:\n${verifyUrl}\n\nExpires in 24 hours.`,
      });
    } catch (mailErr) {
      console.warn('Notice resending creator verification email:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      verificationCode: newCode,
    });
  }

  // 4. Login
  if (action === 'login') {
    const { email, password, twoFactorCode } = body;
    const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || '127.0.0.1';
    const userAgent = request?.headers?.get('user-agent') || 'Unknown';

    try {
      const result = await authenticateCreator(email, password, { ip, userAgent, twoFactorCode });
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

  // 5. Logout
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

  // 6. Me
  if (action === 'me') {
    const current = await getCreatorSession(request);
    if (!current) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ success: true, creator: current });
  }

  // 7. Recover / Forgot Password
  if (action === 'recover') {
    const { email } = body;
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const recoveryCode = crypto.randomInt(100000, 999999).toString();

    const res = await queryDb(
      `UPDATE creators 
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour', updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($2)
       RETURNING id, name, email`,
      [recoveryCode, cleanEmail]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No creator account found with this email address.' }, { status: 404 });
    }

    const creator = res.rows[0];
    console.log(`[CREATOR RECOVERY] Password reset code for ${cleanEmail}: ${recoveryCode}`);

    try {
      await sendEmail({
        to: cleanEmail,
        subject: `Your Password Reset Code: ${recoveryCode} - ${SITE_NAME}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Password Reset Code</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              Hello ${creator.name}, you requested to reset your password on ${SITE_NAME}. Use the 6-digit code below to set your new password:
            </p>
            <div style="background: #f8fafc; border: 2px dashed #e11d48; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #e11d48;">${recoveryCode}</span>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
              This code will expire in 1 hour. If you did not request a password reset, please ignore this email.
            </p>
          </div>
        `,
        text: `Hello ${creator.name},\n\nYour ${SITE_NAME} password reset code is: ${recoveryCode}\n\nExpires in 1 hour.`,
      });
    } catch (mailErr) {
      console.warn('Notice sending creator reset email:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'A 6-digit password reset code has been sent to your email.',
      recoveryCode,
    });
  }

  // 8. Reset Password
  if (action === 'reset_password') {
    const { email, code, token, newPassword } = body;
    const recoveryCode = String(code || token || '').trim();

    if (!email || !recoveryCode || !newPassword) {
      return NextResponse.json({ success: false, error: 'Email, recovery code, and new password are required.' }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const res = await queryDb(
      `SELECT id, name, email, recovery_token, recovery_token_expires 
       FROM creators WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
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

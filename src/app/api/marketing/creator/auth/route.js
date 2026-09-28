import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/db/pg';
import { sendEmail } from '@/lib/db/mailer';
import { SITE_NAME } from '@/lib/db/secret';
import {
  authenticateCreator,
  getCreatorSession,
  clearCreatorSessionCookie,
  setCreatorSessionCookie,
  generateToken,
  hashPassword,
} from '@/lib/middleware/creator';

/**
 * API Route: /api/creator/auth
 * Dedicated to `creators` table authentication and session management.
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

    const res = await queryDb(
      `INSERT INTO creators (name, email, password, phone, bio, is_active, is_verified, verification_code, verification_expires_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, FALSE, $6, CURRENT_TIMESTAMP + INTERVAL '24 hours')
       RETURNING id, name, email, phone, bio, is_active, is_verified, created_at`,
      [
        d.name.trim(),
        cleanEmail,
        hashedPassword,
        d.phone ? d.phone.trim() : null,
        d.bio ? d.bio.trim() : 'New Platform Creator',
        verificationCode,
      ]
    );

    const newCreator = res.rows[0];

    // Insert into leads table
    try {
      await queryDb(
        `INSERT INTO leads (name, email, phone, company, source, status, notes)
         VALUES ($1, $2, $3, $4, 'CREATOR_REGISTRATION', 'NEW', $5)`,
        [
          d.name.trim(),
          cleanEmail,
          d.phone ? d.phone.trim() : null,
          d.company ? d.company.trim() : 'Creator Studio',
          `Creator registered. Creator ID: ${newCreator.id}`,
        ]
      );
    } catch (leadErr) {
      console.warn('Notice inserting lead for new creator:', leadErr.message);
    }

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
              Thank you for joining our creator platform. Use the 6-digit verification code below to activate your creator account:
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
      creator: newCreator,
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
      `SELECT id, name, email, is_verified, verification_code, verification_expires_at 
       FROM creators WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
    );

    const creator = res.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator account not found.' }, { status: 404 });
    }

    if (creator.is_verified === true) {
      return NextResponse.json({
        success: true,
        message: 'Your account is already verified! You can log in directly.',
        alreadyVerified: true,
      });
    }

    if (!creator.verification_code || creator.verification_code.trim() !== candidateCode) {
      return NextResponse.json({ success: false, error: 'Invalid verification code.' }, { status: 400 });
    }

    if (creator.verification_expires_at && new Date(creator.verification_expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'This verification code has expired. Please request a new code.', expired: true }, { status: 400 });
    }

    // Mark creator as verified
    await queryDb(
      `UPDATE creators 
       SET is_verified = TRUE, verification_code = NULL, verification_expires_at = NULL 
       WHERE id = $1`,
      [creator.id]
    );

    // Mark lead as QUALIFIED
    try {
      await queryDb(`UPDATE leads SET status = 'QUALIFIED' WHERE LOWER(email) = $1`, [cleanEmail]);
    } catch (leadErr) {
      console.warn('Notice updating lead to QUALIFIED:', leadErr.message);
    }

    const sessionToken = generateToken(
      { id: creator.id, email: cleanEmail, role: 'creator', type: 'creator' },
      '7d'
    );

    const resp = NextResponse.json({
      success: true,
      message: 'Your creator account has been successfully verified! You are now logged in.',
      creator: {
        id: creator.id,
        name: creator.name,
        email: creator.email,
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
      'SELECT id, name, email, is_active, is_verified FROM creators WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );

    const creator = res.rows[0];
    if (!creator) {
      return NextResponse.json({ success: false, error: 'Creator account not found with this email.' }, { status: 404 });
    }

    if (creator.is_active === false) {
      return NextResponse.json({ success: false, error: 'This account has been deactivated.' }, { status: 403 });
    }

    if (creator.is_verified === true) {
      return NextResponse.json({ success: true, message: 'This account is already verified! You can log in directly.', alreadyVerified: true });
    }

    const newCode = crypto.randomInt(100000, 999999).toString();
    await queryDb(
      `UPDATE creators 
       SET verification_code = $1, verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours' 
       WHERE id = $2`,
      [newCode, creator.id]
    );

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

    return NextResponse.json({ success: true, message: 'A new 6-digit verification code has been sent to your email.' });
  }

  // 4. Login
  if (action === 'login') {
    const { email, password, twoFactorCode } = body;
    const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || '127.0.0.1';
    const userAgent = request?.headers?.get('user-agent') || 'Unknown';

    try {
      const result = await authenticateCreator(email, password, { ip, userAgent, twoFactorCode });
      return NextResponse.json({
        success: true,
        creator: result.creator,
        token: result.token,
        message: 'Logged in successfully.',
      });
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
    await clearCreatorSessionCookie();
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  }

  // 6. Me
  if (action === 'me') {
    const current = await getCreatorSession(request);
    if (!current) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ success: true, creator: current });
  }

  // 7. Recover
  if (action === 'recover') {
    const { email } = body;
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const recoveryCode = crypto.randomInt(100000, 999999).toString();

    const res = await queryDb(
      `UPDATE creators 
       SET recovery_token = $1, recovery_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
       WHERE LOWER(email) = LOWER($2)
       RETURNING id, name, email`,
      [recoveryCode, cleanEmail]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No creator account found with this email address.' }, { status: 404 });
    }

    const creator = res.rows[0];
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

    return NextResponse.json({ success: true, message: 'A 6-digit password reset code has been sent to your email.' });
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
      `SELECT id, name, email, recovery_token, recovery_token_expires_at 
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

    if (creator.recovery_token_expires_at && new Date(creator.recovery_token_expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'This reset code has expired. Please request a new one.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await queryDb(
      `UPDATE creators 
       SET password = $1, recovery_token = NULL, recovery_token_expires_at = NULL 
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

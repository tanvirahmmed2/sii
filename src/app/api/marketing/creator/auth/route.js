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
    const existing = await queryDb('SELECT id, auth_provider, google_id FROM creators WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    if (existing.rows.length > 0) {
      const ex = existing.rows[0];
      if (ex.auth_provider === 'google' || ex.google_id) {
        return NextResponse.json({
          success: false,
          error: 'An account with this email was registered using Google. Please log in with Google.',
          registeredWithGoogle: true,
        }, { status: 409 });
      }
      return NextResponse.json({
        success: false,
        error: 'An account with this email already exists. Please log in.',
        registeredWithPassword: true,
      }, { status: 409 });
    }

    const hashedPassword = await hashPassword(d.password);
    const verificationCode = generateAlphanumericToken(6);
    const phone = (d.phone || '').trim() || null;
    const country = (d.country || '').trim() || null;
    const city = (d.city || '').trim() || null;
    const address = (d.address || '').trim() || null;

    const res = await queryDb(
      `INSERT INTO creators (name, email, password, phone, country, city, address, auth_provider, email_verified, verification_token, verification_token_expires, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'local', FALSE, $8, CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE)
       RETURNING id, name, email, phone, auth_provider, email_verified, is_active, created_at`,
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

  // 1B. Google Authentication (Register & Login)
  if (action === 'google_auth') {
    let googleEmail = (body.email || '').trim().toLowerCase();
    let googleId = (body.googleId || body.google_id || '').trim();
    let googleName = (body.name || '').trim();
    let googlePicture = body.avatarUrl || body.avatar_url || body.picture || null;
    const mode = body.mode || 'login'; // 'register' | 'login'

    // Extract from Google credential (id_token JWT) if provided
    if (body.credential) {
      try {
        const parts = String(body.credential).split('.');
        if (parts.length >= 2) {
          const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const decodedJson = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          if (decodedJson.email) {
            googleEmail = decodedJson.email.trim().toLowerCase();
          }
          if (decodedJson.sub) {
            googleId = decodedJson.sub;
          }
          if (decodedJson.name && !googleName) {
            googleName = decodedJson.name.trim();
          }
          if (decodedJson.picture && !googlePicture) {
            googlePicture = decodedJson.picture;
          }
        }
      } catch (err) {
        console.warn('Notice decoding Google credential:', err.message);
      }
    }

    if (!googleEmail) {
      return NextResponse.json({ success: false, error: 'Valid Google email is required.' }, { status: 400 });
    }

    // Check for existing account with this email or google_id
    const existingRes = await queryDb(
      `SELECT id, name, email, phone, auth_provider, google_id, avatar_url, is_active, email_verified, password
       FROM creators
       WHERE LOWER(email) = LOWER($1) OR (google_id IS NOT NULL AND google_id = $2)
       LIMIT 1`,
      [googleEmail, googleId || '__none__']
    );
    const existingCreator = existingRes.rows[0];

    // REGISTRATION MODE: Prevent duplicate accounts
    if (mode === 'register') {
      if (existingCreator) {
        if (existingCreator.auth_provider === 'google' || existingCreator.google_id) {
          return NextResponse.json({
            success: false,
            error: 'An account with this Google email already exists. Please log in directly.',
            registeredWithGoogle: true,
          }, { status: 409 });
        } else {
          return NextResponse.json({
            success: false,
            error: 'An account with this email already exists with password login. Please log in with your password.',
            registeredWithPassword: true,
          }, { status: 409 });
        }
      }

      // No existing account: create new Google creator account
      const randomPass = generateAlphanumericToken(32);
      const hashedFallbackPassword = await hashPassword(randomPass);

      const insertRes = await queryDb(
        `INSERT INTO creators (
           name, email, google_id, auth_provider, avatar_url,
           email_verified, is_active, password
         )
         VALUES ($1, $2, $3, 'google', $4, TRUE, TRUE, $5)
         RETURNING id, name, email, phone, auth_provider, avatar_url, email_verified, is_active, created_at`,
        [googleName || googleEmail.split('@')[0], googleEmail, googleId || null, googlePicture, hashedFallbackPassword]
      );
      const newCreator = insertRes.rows[0];

      const sessionToken = generateToken(
        { id: Number(newCreator.id), email: googleEmail, role: 'creator', type: 'creator' },
        '7d'
      );

      const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || '127.0.0.1';
      const userAgent = request?.headers?.get('user-agent') || 'Unknown';

      await queryDb(
        `INSERT INTO creator_login_sessions (creator_id, token, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
        [newCreator.id, sessionToken, ip, userAgent]
      ).catch(() => {});

      const resp = NextResponse.json({
        success: true,
        message: 'Account created with Google successfully! Redirecting...',
        creator: {
          id: Number(newCreator.id),
          name: newCreator.name,
          email: newCreator.email,
          avatarUrl: newCreator.avatar_url,
          authProvider: 'google',
          emailVerified: true,
          isVerified: true,
        },
        token: sessionToken,
      });

      await setCreatorSessionCookie(resp, sessionToken);
      return resp;
    }

    // LOGIN MODE:
    if (!existingCreator) {
      return NextResponse.json({
        success: false,
        error: 'No creator account found with this Google email. Please register first.',
        notRegistered: true,
      }, { status: 404 });
    }

    if (existingCreator.is_active === false) {
      return NextResponse.json({ success: false, error: 'Your creator account has been deactivated.' }, { status: 403 });
    }

    // Link google_id or update avatar if newly authenticating with Google
    if (!existingCreator.google_id && googleId) {
      await queryDb(
        `UPDATE creators
         SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [googleId, googlePicture, existingCreator.id]
      ).catch(() => {});
    }

    await queryDb('UPDATE creators SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [existingCreator.id]).catch(() => {});

    const sessionToken = generateToken(
      { id: Number(existingCreator.id), email: existingCreator.email, role: 'creator', type: 'creator' },
      '7d'
    );

    const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('x-real-ip') || '127.0.0.1';
    const userAgent = request?.headers?.get('user-agent') || 'Unknown';

    await queryDb(
      `INSERT INTO creator_login_sessions (creator_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [existingCreator.id, sessionToken, ip, userAgent]
    ).catch(() => {});

    const resp = NextResponse.json({
      success: true,
      message: 'Logged in with Google successfully! Redirecting...',
      creator: {
        id: Number(existingCreator.id),
        name: existingCreator.name,
        email: existingCreator.email,
        avatarUrl: existingCreator.avatar_url,
        authProvider: existingCreator.auth_provider || 'google',
        emailVerified: true,
        isVerified: true,
      },
      token: sessionToken,
    });

    await setCreatorSessionCookie(resp, sessionToken);
    return resp;
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
      `SELECT id, name, email, email_verified, verification_token, verification_token_expires 
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

    const newCode = generateAlphanumericToken(6);
    await queryDb(
      `UPDATE creators 
       SET verification_token = $1, verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newCode, creator.id]
    );

    console.log(`[CREATOR RESEND] New verification code for ${cleanEmail}: ${newCode}`);

    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/creator/verify?token=${newCode}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      await sendEmail({
        to: cleanEmail,
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
          googleAuth: Boolean(authErr.googleAuth),
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
    const recoveryCode = generateAlphanumericToken(6);

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
        html: buildStyledEmail({
          title: 'Password Reset Request',
          subtitle: `${SITE_NAME} Security Recovery`,
          recipientName: creator.name,
          bodyParagraphs: [
            `You requested to reset your password on ${SITE_NAME}. Use the security recovery token below to set your new password:`,
          ],
          code: recoveryCode,
          codeLabel: 'Recovery Token',
          footerNote: 'This recovery token will expire in 1 hour. If you did not request a password reset, please ignore this email.',
        }),
        text: `Hello ${creator.name},\n\nYour ${SITE_NAME} password reset code is: ${recoveryCode}\n\nExpires in 1 hour.`,
      });
    } catch (mailErr) {
      console.warn('Notice sending creator reset email:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'A 6-digit password reset code has been sent to your email.',
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

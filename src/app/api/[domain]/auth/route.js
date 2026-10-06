import { NextResponse } from 'next/server';
import { generateRandomCode, generateRandomHex, generateToken } from 'src/lib/utils/random';
import { queryDb } from 'src/lib/database/db';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import {
  resolveWebsiteFromRequest,
  hashPassword,
  comparePassword,
  generateWebsiteToken,
  getWebsiteUserSession,
  getUserRolesAndPermissions,
  WEBSITE_AUTH_COOKIE,
} from 'src/lib/middleware/creator';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const session = await getWebsiteUserSession(request, website.id);
    if (!session) {
      return NextResponse.json({ success: false, user: null });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        phone: session.phone,
        avatar_url: session.avatar_url,
        is_active: session.is_active,
        roles: session.roles || [],
        permissions: session.permissionSlugs || [],
        isOwner: session.isOwner || false,
        isAdmin: session.isAdmin || false,
      },
    });
  } catch (error) {
    console.error('Tenant auth GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'login';

    const origin = getBaseUrl(request);

    const siteTitle = website.settings?.site_title || website.name || 'Tenant Website';
    const siteSlug = website.custom_domain || website.subdomain || website.slug || '';

    // ------------------------------------------------------------------------
    // 1. REGISTER
    // ------------------------------------------------------------------------
    if (action === 'register') {
      const { name, email, password, phone, bio } = body;

      if (!name || !email || !password) {
        return NextResponse.json(
          { success: false, error: 'Name, email, and password are required.' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      const cleanEmail = String(email).trim().toLowerCase();

      // Check if user already exists on this specific tenant website
      const existing = await queryDb(
        'SELECT id FROM website_users WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1',
        [websiteId, cleanEmail]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists on this website.' },
          { status: 409 }
        );
      }

      const hashedPassword = await hashPassword(password);
      const verificationCode = generateToken(6);

      const userRes = await queryDb(
        `INSERT INTO website_users (
          website_id, name, email, password, phone, bio,
          is_active, email_verified, verification_code, verification_expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, $7, CURRENT_TIMESTAMP + INTERVAL '24 hours')
        RETURNING id, website_id, name, email, phone, bio, is_active, email_verified, created_at`,
        [
          websiteId,
          name.trim(),
          cleanEmail,
          hashedPassword,
          phone ? phone.trim() : null,
          bio ? bio.trim() : null,
          verificationCode,
        ]
      );

      const newUser = userRes.rows[0];

      // Assign default role if available (e.g. 'member' or 'customer')
      try {
        let defaultRole = await queryDb(
          "SELECT id FROM website_roles WHERE website_id = $1 AND slug IN ('member', 'customer', 'client', 'user') LIMIT 1",
          [websiteId]
        );
        if (defaultRole.rows.length > 0) {
          await queryDb(
            'INSERT INTO website_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [newUser.id, defaultRole.rows[0].id]
          );
        }
      } catch (roleErr) {
        console.warn('Default role assignment notice:', roleErr.message);
      }

      // Send verification email
      const verifyUrl = `${origin}/website/${encodeURIComponent(siteSlug)}/verify?email=${encodeURIComponent(cleanEmail)}&code=${verificationCode}`;

      try {
        await sendEmail({
          to: cleanEmail,
          subject: `Verify Your Account - ${siteTitle}`,
          html: buildStyledEmail({
            title: `Welcome to ${siteTitle}`,
            subtitle: 'Account Verification',
            recipientName: newUser.name,
            bodyParagraphs: [
              'Please verify your email address to complete your registration.',
            ],
            code: verificationCode,
            codeLabel: 'Verification Code',
            actionUrl: verifyUrl,
            actionText: 'Verify Email Address',
            footerNote: 'This code expires in 24 hours. If you did not create this account, please ignore this email.',
          }),
          text: `Welcome to ${siteTitle}! Your verification code is ${verificationCode}. Verify at: ${verifyUrl}`,
        });
      } catch (mailErr) {
        console.warn('Verification email send notice:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Account registered successfully! Please check your email for the 6-digit verification code.',
        user: newUser,
      });
    }

    // ------------------------------------------------------------------------
    // 2. VERIFY
    // ------------------------------------------------------------------------
    if (action === 'verify') {
      const { email, code } = body;

      if (!email || !code) {
        return NextResponse.json(
          { success: false, error: 'Email and verification code are required.' },
          { status: 400 }
        );
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanCode = String(code).trim();

      const userRes = await queryDb(
        `SELECT id, name, email, email_verified, verification_code, verification_expires_at
         FROM website_users
         WHERE website_id = $1 AND LOWER(email) = $2
         LIMIT 1`,
        [websiteId, cleanEmail]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
      }

      const user = userRes.rows[0];

      if (user.email_verified) {
        return NextResponse.json({
          success: true,
          message: 'Email has already been verified. You can proceed to log in.',
        });
      }

      if (!user.verification_code || user.verification_code !== cleanCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code.' },
          { status: 400 }
        );
      }

      if (user.verification_expires_at && new Date() > new Date(user.verification_expires_at)) {
        return NextResponse.json(
          { success: false, error: 'Verification code has expired. Please request a new code.' },
          { status: 400 }
        );
      }

      await queryDb(
        `UPDATE website_users
         SET email_verified = TRUE, verification_code = NULL, verification_expires_at = NULL
         WHERE id = $1`,
        [user.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Your email address has been successfully verified! You can now log in.',
      });
    }

    // ------------------------------------------------------------------------
    // 3. RESEND VERIFICATION CODE
    // ------------------------------------------------------------------------
    if (action === 'resend_code') {
      const { email } = body;

      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const userRes = await queryDb(
        `SELECT id, name, email, email_verified
         FROM website_users
         WHERE website_id = $1 AND LOWER(email) = $2
         LIMIT 1`,
        [websiteId, cleanEmail]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'If an unverified account exists, a new verification code has been dispatched.',
        });
      }

      const user = userRes.rows[0];
      if (user.email_verified) {
        return NextResponse.json({
          success: true,
          message: 'Account is already verified. You can log in directly.',
        });
      }

      const newCode = generateToken(6);
      await queryDb(
        `UPDATE website_users
         SET verification_code = $1, verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE id = $2`,
        [newCode, user.id]
      );

      const verifyUrl = `${origin}/website/${encodeURIComponent(siteSlug)}/verify?email=${encodeURIComponent(cleanEmail)}&code=${newCode}`;

      try {
        await sendEmail({
          to: cleanEmail,
          subject: `Your New Verification Code - ${siteTitle}`,
          html: buildStyledEmail({
            title: 'New Verification Code',
            subtitle: `${siteTitle} Account Verification`,
            recipientName: user.name,
            bodyParagraphs: [
              'Here is your new verification code to verify your account:',
            ],
            code: newCode,
            codeLabel: 'Verification Code',
            actionUrl: verifyUrl,
            actionText: 'Verify Email Address',
            footerNote: 'This code expires in 24 hours. If you did not request this, please ignore this email.',
          }),
          text: `Your verification code is ${newCode}. Verify at: ${verifyUrl}`,
        });
      } catch (mailErr) {
        console.warn('Resend code email notice:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'A new verification code has been sent to your email address.',
      });
    }

    // ------------------------------------------------------------------------
    // 4. RECOVER (REQUEST PASSWORD RESET)
    // ------------------------------------------------------------------------
    if (action === 'recover' || action === 'forgot_password') {
      const { email } = body;

      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const userRes = await queryDb(
        `SELECT id, name, email FROM website_users WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1`,
        [websiteId, cleanEmail]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email address, password recovery instructions have been sent.',
        });
      }

      const user = userRes.rows[0];
      const resetToken = generateToken(16);
      const resetCode = generateToken(6);

      await queryDb(
        `UPDATE website_users
         SET reset_token = $1, reset_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
         WHERE id = $2`,
        [`${resetCode}:${resetToken}`, user.id]
      );

      const resetUrl = `${origin}/website/${encodeURIComponent(siteSlug)}/recover?email=${encodeURIComponent(cleanEmail)}&token=${resetCode}`;

      try {
        await sendEmail({
          to: cleanEmail,
          subject: `Reset Your Password - ${siteTitle}`,
          html: buildStyledEmail({
            title: 'Password Recovery Request',
            subtitle: `${siteTitle} Account Security`,
            recipientName: user.name,
            bodyParagraphs: [
              `We received a request to reset your password for your account on ${siteTitle}.`,
            ],
            code: resetCode,
            codeLabel: 'Recovery Token',
            actionUrl: resetUrl,
            actionText: 'Reset Password Now',
            footerNote: 'This recovery code expires in 1 hour. If you did not request this, you can safely ignore this email.',
          }),
          text: `Reset your password at ${resetUrl} or use code: ${resetCode}`,
        });
      } catch (mailErr) {
        console.warn('Password recovery email notice:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Password recovery instructions and reset code have been sent to your email.',
      });
    }

    // ------------------------------------------------------------------------
    // 5. RESET PASSWORD
    // ------------------------------------------------------------------------
    if (action === 'reset_password') {
      const { email, token, password } = body;

      if (!email || !token || !password) {
        return NextResponse.json(
          { success: false, error: 'Email, reset code/token, and new password are required.' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanToken = String(token).trim();

      const userRes = await queryDb(
        `SELECT id, name, email, reset_token, reset_expires_at
         FROM website_users
         WHERE website_id = $1 AND LOWER(email) = $2
         LIMIT 1`,
        [websiteId, cleanEmail]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
      }

      const user = userRes.rows[0];

      if (!user.reset_token) {
        return NextResponse.json({ success: false, error: 'No password reset requested.' }, { status: 400 });
      }

      if (user.reset_expires_at && new Date() > new Date(user.reset_expires_at)) {
        return NextResponse.json({ success: false, error: 'Password reset code has expired.' }, { status: 400 });
      }

      const matches =
        user.reset_token === cleanToken ||
        user.reset_token.startsWith(`${cleanToken}:`) ||
        user.reset_token.endsWith(`:${cleanToken}`);

      if (!matches) {
        return NextResponse.json({ success: false, error: 'Invalid reset code or token.' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);

      await queryDb(
        `UPDATE website_users
         SET password = $1, reset_token = NULL, reset_expires_at = NULL
         WHERE id = $2`,
        [hashedPassword, user.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Password successfully reset! You can now log in with your new password.',
      });
    }

    // ------------------------------------------------------------------------
    // 6. LOGIN
    // ------------------------------------------------------------------------
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'Email and password are required.' },
          { status: 400 }
        );
      }

      const cleanEmail = String(email).trim().toLowerCase();

      const userRes = await queryDb(
        `SELECT id, website_id, name, email, password, phone, avatar_url, is_active, email_verified
         FROM website_users
         WHERE website_id = $1 AND LOWER(email) = $2
         LIMIT 1`,
        [websiteId, cleanEmail]
      );

      if (userRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password.' },
          { status: 401 }
        );
      }

      const user = userRes.rows[0];

      if (!user.is_active) {
        return NextResponse.json(
          { success: false, error: 'Your account is currently disabled. Please contact site support.' },
          { status: 403 }
        );
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password.' },
          { status: 401 }
        );
      }

      await queryDb('UPDATE website_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      const token = generateWebsiteToken({
        userId: user.id,
        websiteId: user.website_id,
        email: user.email,
      });

      const { roles, permissions, permissionSlugs } = await getUserRolesAndPermissions(websiteId, user.id);

      const response = NextResponse.json({
        success: true,
        message: 'Login successful!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          email_verified: user.email_verified,
          roles,
          permissions: permissionSlugs,
          isOwner: roles.some((r) => r.slug === 'owner'),
          isAdmin: roles.some((r) => r.slug === 'admin' || r.slug === 'owner'),
        },
      });

      response.cookies.set(WEBSITE_AUTH_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // ------------------------------------------------------------------------
    // 7. LOGOUT
    // ------------------------------------------------------------------------
    if (action === 'logout') {
      const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });

      response.cookies.delete(WEBSITE_AUTH_COOKIE);
      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid auth action.' }, { status: 400 });
  } catch (error) {
    console.error('Tenant auth POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

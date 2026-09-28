import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/db/pg';
import { sendEmail } from '@/lib/db/mailer';
import {
  resolveWebsiteFromRequest,
  hashPassword,
  comparePassword,
  generateWebsiteToken,
  getWebsiteUserSession,
  getUserRolesAndPermissions,
  WEBSITE_AUTH_COOKIE,
} from '@/lib/middleware/user';

export async function GET(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
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
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'login';

    const origin =
      request.headers.get('origin') ||
      (request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        : '') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const siteTitle = website.settings?.site_title || website.name || 'Tenant Website';
    const siteSlug = website.subdomain || slug;

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
      const verificationCode = crypto.randomInt(100000, 999999).toString();

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
      const verifyUrl = `${origin}/website/${siteSlug}/verify?email=${encodeURIComponent(cleanEmail)}&code=${verificationCode}`;

      try {
        await sendEmail({
          to: cleanEmail,
          subject: `Verify Your Account - ${siteTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Welcome to ${siteTitle}!</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Hello ${newUser.name}, please verify your email address to complete your registration.
              </p>
              <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${verificationCode}</span>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${verifyUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                This code expires in 24 hours. If you did not create this account, please ignore this email.
              </p>
            </div>
          `,
          text: `Welcome to ${siteTitle}! Your verification code is ${verificationCode}. Verify at: ${verifyUrl}`,
        });
      } catch (mailErr) {
        console.warn('Verification email send notice:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Account registered successfully! Please check your email for the 6-digit verification code.',
        user: newUser,
        devCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined,
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

      const newCode = crypto.randomInt(100000, 999999).toString();
      await queryDb(
        `UPDATE website_users
         SET verification_code = $1, verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE id = $2`,
        [newCode, user.id]
      );

      const verifyUrl = `${origin}/website/${siteSlug}/verify?email=${encodeURIComponent(cleanEmail)}&code=${newCode}`;

      try {
        await sendEmail({
          to: cleanEmail,
          subject: `Your New Verification Code - ${siteTitle}`,
          html: `
            <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #0f172a; margin-top: 0;">New Verification Code</h2>
              <p style="color: #475569; font-size: 14px;">Here is your requested verification code:</p>
              <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${newCode}</span>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${verifyUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block;">
                  Verify Email
                </a>
              </div>
            </div>
          `,
          text: `Your verification code is ${newCode}. Verify at: ${verifyUrl}`,
        });
      } catch (mailErr) {
        console.warn('Resend code email notice:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'A new verification code has been sent to your email address.',
        devCode: process.env.NODE_ENV !== 'production' ? newCode : undefined,
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
      const resetToken = crypto.randomBytes(24).toString('hex');
      const resetCode = crypto.randomInt(100000, 999999).toString();

      await queryDb(
        `UPDATE website_users
         SET reset_token = $1, reset_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
         WHERE id = $2`,
        [`${resetCode}:${resetToken}`, user.id]
      );

      const resetUrl = `${origin}/website/${siteSlug}/recover?email=${encodeURIComponent(cleanEmail)}&token=${resetCode}`;

      try {
        await sendEmail({
          to: cleanEmail,
          subject: `Reset Your Password - ${siteTitle}`,
          html: `
            <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #0f172a; margin-top: 0;">Password Recovery Request</h2>
              <p style="color: #475569; font-size: 14px;">
                Hello ${user.name}, we received a request to reset your password for your account on <strong>${siteTitle}</strong>.
              </p>
              <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold;">Reset Code</p>
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${resetCode}</span>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 10px; display: inline-block;">
                  Reset Password Now
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                This recovery code expires in 1 hour. If you did not request this, you can safely ignore this email.
              </p>
            </div>
          `,
          text: `Reset your password at ${resetUrl} or use code: ${resetCode}`,
        });
      } catch (mailErr) {
        console.warn('Password recovery email notice:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Password recovery instructions and reset code have been sent to your email.',
        devCode: process.env.NODE_ENV !== 'production' ? resetCode : undefined,
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

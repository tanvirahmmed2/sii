import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, DEVELOPER_TOKEN, SITE_NAME } from '../database/secret.js';
import { query, queryDb } from '../database/db.js';
import { sendEmail, buildStyledEmail } from '../database/brevo.js';
import { sendSms, maskPhoneNumber } from '../database/smsSender.js';
import {
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  generateSecureOtp,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
} from '../security/shield.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_jwt_secret_key_2026';
export const DEVELOPER_COOKIE_NAME = DEVELOPER_TOKEN;
export const ADMIN_COOKIE_NAME = DEVELOPER_TOKEN; 

async function getCookieStore() {
  try {
    const nextHeaders = await import('next/headers');
    if (nextHeaders && typeof nextHeaders.cookies === 'function') {
      return await nextHeaders.cookies();
    }
  } catch {
  }
  return null;
}

export async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required for hashing.');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(String(password), String(hash));
  } catch (err) {
    console.warn('Password comparison notice:', err.message);
    return false;
  }
}

export function signJWT(payload, expiresIn = '7d') {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn });
}

export function generateToken(payload, expiresIn = '7d') {
  const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return signJWT({ ...payload, jti }, expiresIn);
}

export function verifyJWT(token) {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch {
    return null;
  }
}

export async function setDeveloperSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, 
  };

  if (response && response.cookies) {
    response.cookies.set(DEVELOPER_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        cookieStore.set(DEVELOPER_COOKIE_NAME, token, cookieOptions);
      }
    } catch {
    }
  }
}

export async function clearDeveloperSessionCookie(response) {
  if (response && response.cookies) {
    response.cookies.delete(DEVELOPER_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        cookieStore.delete(DEVELOPER_COOKIE_NAME);
      }
    } catch {
    }
  }
}

export const setAdminSessionCookie = setDeveloperSessionCookie;
export const clearAdminSessionCookie = clearDeveloperSessionCookie;

export async function getDeveloperSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(DEVELOPER_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      try {
        const cookieStore = await getCookieStore();
        if (cookieStore) {
          token = cookieStore.get(DEVELOPER_COOKIE_NAME)?.value;
        }
      } catch {
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const res = await query(
      `SELECT d.id, d.name, d.email, d.phone, d.role_id, d.bio,
              d.github_profile, d.linkedin_profile, d.is_active, d.email_verified
       FROM developers d
       WHERE d.id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (res.rows.length === 0) return null;
    const dev = res.rows[0];

    if (!dev.is_active) return null;

    try {
      const sessRes = await query(
        `SELECT is_active, expires_at FROM developer_login_sessions WHERE token = $1 AND developer_id = $2 LIMIT 1`,
        [token, dev.id]
      );

      if (sessRes.rows.length === 0) {
        await query(
          `INSERT INTO developer_login_sessions (developer_id, token, ip_address, user_agent, expires_at, is_active)
           VALUES ($1, $2, '127.0.0.1', 'Active Session', CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE)
           ON CONFLICT (token) DO UPDATE SET is_active = TRUE, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days', last_active_at = CURRENT_TIMESTAMP`,
          [dev.id, token]
        ).catch(() => {});
      } else {
        const s = sessRes.rows[0];
        if (s.is_active === false) return null;
        if (s.expires_at && new Date(s.expires_at) < new Date()) return null;

        query(
          `UPDATE developer_login_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE token = $1`,
          [token]
        ).catch(() => {});
      }
    } catch (e) {
      console.warn('Notice verifying developer session against database:', e.message);
    }

    let permRes = { rows: [] };
    if (dev.role_id) {
      permRes = await queryDb(
        `SELECT m.slug AS module_slug, drp.can_view, drp.can_create, drp.can_edit, drp.can_delete
         FROM developer_role_permissions drp
         JOIN modules m ON drp.module_id = m.id
         WHERE drp.role_id = $1 AND m.is_active = TRUE`,
        [dev.role_id]
      ).catch(() => ({ rows: [] }));
    }

    if (!permRes.rows || permRes.rows.length === 0) {
      permRes = await queryDb(
        `SELECT m.slug AS module_slug, mp.can_view, mp.can_create, mp.can_edit, mp.can_delete
         FROM module_permissions mp
         JOIN modules m ON mp.module_id = m.id
         WHERE mp.developer_id = $1 AND m.is_active = TRUE`,
        [dev.id]
      ).catch(() => ({ rows: [] }));
    }

    let permissions = permRes.rows
      .filter((r) => r.can_view)
      .map((r) => r.module_slug);

    const isOwner = Number(dev.id) === 1 || String(dev.email).toLowerCase() === 'tanvir004006@gmail.com';
    if (isOwner) {
      const allMods = await queryDb(`SELECT slug FROM modules WHERE is_active = TRUE`).catch(() => ({ rows: [] }));
      permissions = Array.from(new Set([...permissions, ...allMods.rows.map((r) => r.slug)]));
    }

    const permissionsMap = {};
    for (const r of permRes.rows) {
      permissionsMap[r.module_slug] = {
        can_view: Boolean(r.can_view),
        can_create: Boolean(r.can_create),
        can_edit: Boolean(r.can_edit),
        can_delete: Boolean(r.can_delete),
      };
    }

    return {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      phone: dev.phone,
      roleId: dev.role_id,
      bio: dev.bio,
      githubProfile: dev.github_profile,
      linkedinProfile: dev.linkedin_profile,
      isActive: dev.is_active,
      isVerified: Boolean(dev.email_verified),
      permissions,
      permissionsMap,
      token,
    };
  } catch (error) {
    console.error('Error fetching developer session:', error);
    return null;
  }
}

export const getAdminSession = getDeveloperSession;
export const getAuthenticatedUser = getDeveloperSession;

export async function isDeveloper(request) {
  try {
    const session = await getDeveloperSession(request);
    return Boolean(session && session.isActive);
  } catch {
    return false;
  }
}

export const getDeveloperUser = getDeveloperSession;

export async function isStaff(request) {
  const session = await getDeveloperSession(request);
  if (!session || !session.isActive) {
    return { success: false, user: null, staff: null };
  }
  return { success: true, user: session, staff: session };
}
export const authenticateStaff = isStaff;

export async function hasModulePermission(request, moduleSlug, action = 'view') {
  try {
    const session = await getDeveloperSession(request);
    if (!session || !session.isActive) {
      return { success: false, user: null, staff: null, developer: null, message: 'Unauthenticated', canEdit: false };
    }

    if (!moduleSlug || moduleSlug === 'profile') {
      return { success: true, user: session, staff: session, developer: session, canEdit: true };
    }

    const isOwner = Number(session.id) === 1 || String(session.email).toLowerCase() === 'tanvir004006@gmail.com';
    if (isOwner) {
      return { success: true, user: session, staff: session, developer: session, canEdit: true, isOwner: true };
    }

    const slugs = (Array.isArray(moduleSlug) ? moduleSlug : [moduleSlug])
      .map((s) => String(s || '').toLowerCase().trim())
      .filter(Boolean);

    if (slugs.length === 0) {
      return { success: true, user: session, staff: session, developer: session, canEdit: true };
    }

    const permRes = await queryDb(
      `SELECT mp.can_view, mp.can_create, mp.can_edit, mp.can_delete
       FROM module_permissions mp
       JOIN modules m ON mp.module_id = m.id
       WHERE mp.developer_id = $1 AND LOWER(m.slug) = ANY($2::text[])
       LIMIT 1`,
      [session.id, slugs]
    ).catch(() => ({ rows: [] }));

    if (permRes.rows.length > 0) {
      const p = permRes.rows[0];
      const hasAction = action === 'edit'
        ? p.can_edit
        : action === 'create'
        ? p.can_create
        : action === 'delete'
        ? p.can_delete
        : p.can_view;

      if (hasAction) {
        return { success: true, user: session, staff: session, developer: session, canEdit: Boolean(p.can_edit) };
      }
    }

    const userPerms = (session.permissions || []).map((p) => String(p).toLowerCase().trim());
    const hasPerm = slugs.some((slug) => userPerms.includes(slug));

    if (hasPerm) {
      return { success: true, user: session, staff: session, developer: session, canEdit: true };
    }

    return { success: false, user: session, staff: session, developer: session, message: 'Permission denied for this module', canEdit: false };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { success: false, user: null, staff: null, developer: null, message: error.message, canEdit: false };
  }
}

export const hasDeveloperPermission = hasModulePermission;

export async function requireDeveloperPermission(request, moduleSlug) {
  const check = await hasModulePermission(request, moduleSlug);
  if (!check.success) {
    return {
      ...check,
      status: check.message === 'Unauthenticated' ? 401 : 403,
      error: check.message,
    };
  }
  return check;
}

export async function authenticateDeveloper(identifier, password, { ip = '127.0.0.1', userAgent = 'Unknown', twoFactorCode, channel = 'email' } = {}) {
  const raw = String(identifier || '').trim();
  const cleanEmail = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');
  const cleanPassword = String(password || '');

  const lockoutCheck = await checkAccountLockout({ table: 'developers', identifier: raw });
  if (lockoutCheck.isLocked) {
    const err = new Error(lockoutCheck.error);
    err.status = 429;
    err.locked = true;
    err.remainingMinutes = lockoutCheck.remainingMinutes;
    throw err;
  }

  const devRes = await queryDb(
    `SELECT d.*
     FROM developers d
     WHERE LOWER(d.email) = $1 
        OR d.phone = $2 
        OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(d.phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
     LIMIT 1`,
    [cleanEmail, raw, digits]
  );

  if (devRes.rows.length === 0) {
    throw new Error('Invalid email, phone number, or password.');
  }

  const dev = devRes.rows[0];

  if (!dev.is_active) {
    try {
      await queryDb(
        `INSERT INTO developer_login_activities (developer_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, 'Failed', 'Account deactivated')`,
        [dev.id, ip, userAgent]
      );
    } catch (_) {}
    const err = new Error('Your developer account has been deactivated.');
    err.deactivated = true;
    err.status = 403;
    throw err;
  }

  const isMatch = await comparePassword(cleanPassword, dev.password);
  if (!isMatch) {
    const failInfo = await recordFailedLogin({
      table: 'developers',
      id: dev.id,
      ip,
      userAgent,
      reason: 'Incorrect password',
      maxFailedAttempts: 5,
      lockoutMinutes: 15,
    });

    if (failInfo.isLockedNow) {
      const err = new Error(failInfo.error);
      err.status = 429;
      err.locked = true;
      throw err;
    }

    const message = failInfo.warning
      ? `Invalid password. ${failInfo.warning}`
      : 'Invalid email, phone number, or password.';
    throw new Error(message);
  }

  if (dev.two_factor_enabled) {
    if (!twoFactorCode) {
      const selectedChannel = String(channel || 'email').toLowerCase() === 'sms' ? 'sms' : 'email';

      const rateCheck = await checkOtpDispatchRateLimit({
        identifier: dev.email,
        phone: dev.phone,
        email: dev.email,
        ip
      });

      if (!rateCheck.isAllowed) {
        const err = new Error(rateCheck.error);
        err.status = 429;
        err.rateLimited = true;
        err.remainingMinutes = rateCheck.remainingMinutes;
        err.requires2FA = true;
        err.twoFactorRequired = true;
        err.email = dev.email;
        err.phone = dev.phone;
        throw err;
      }

      const secureOtp = generateSecureOtp(6);
      await queryDb(
        `UPDATE developers 
         SET two_factor_code = $1, 
             two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [secureOtp, dev.id]
      );

      const maskedEmail = dev.email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => {
        return first + '*'.repeat(Math.max(middle.length, 3)) + domain;
      });
      const maskedPhone = maskPhoneNumber(dev.phone);

      if (selectedChannel === 'sms') {
        try {
          await sendSms({
            to: dev.phone,
            message: `Your ${SITE_NAME} Developer 2FA verification code is: ${secureOtp}. Valid for 10 minutes.`,
            purpose: '2fa',
            userId: dev.id,
            userType: 'developer',
            ip
          });
          await recordOtpDispatch({
            identifier: dev.phone,
            phone: dev.phone,
            email: dev.email,
            channel: 'sms',
            purpose: '2fa',
            ip
          });
        } catch (smsErr) {
          console.error('Developer 2FA SMS error:', smsErr.message);
          const err = new Error(`Failed to dispatch SMS: ${smsErr.message || 'SMS delivery failed.'}`);
          err.dispatchFailed = true;
          err.status = 500;
          throw err;
        }
      } else {
        try {
          const emailHtml = buildStyledEmail({
            title: `${SITE_NAME} Security Verification`,
            subtitle: 'Two-Factor Authentication Code',
            recipientName: dev.name || 'Developer',
            bodyParagraphs: [
              'A login request was initiated for your administrator account.',
              'Enter the 6-digit verification code below to authorize your session.'
            ],
            code: secureOtp,
            codeLabel: 'Security Code',
            footerNote: 'This code is valid for 10 minutes. If you did not initiate this login, please secure your password immediately.'
          });

          await sendEmail({
            to: dev.email,
            subject: `Two-Factor Security Code: ${secureOtp} - ${SITE_NAME}`,
            html: emailHtml,
            text: `Your ${SITE_NAME} two-factor code is: ${secureOtp}. Valid for 10 minutes.`,
          });
          await recordOtpDispatch({
            identifier: dev.email,
            phone: dev.phone,
            email: dev.email,
            channel: 'email',
            purpose: '2fa',
            ip
          });
        } catch (mailErr) {
          console.error('Developer 2FA email error:', mailErr.message);
          const err = new Error(`Failed to send verification email: ${mailErr.message || 'Email delivery failed.'}`);
          err.dispatchFailed = true;
          err.status = 500;
          throw err;
        }
      }

      const dest = selectedChannel === 'sms' ? 'registered mobile phone' : 'registered email address';
      const err = new Error(`Two-factor verification code sent via ${selectedChannel === 'sms' ? 'SMS' : 'email'} to your ${dest}.`);
      err.requires2FA = true;
      err.twoFactorRequired = true;
      err.channel = selectedChannel;
      err.hasPhone = Boolean(dev.phone);
      err.hasEmail = Boolean(dev.email);
      err.status = 401;
      throw err;
    }

    const isCodeValid =
      dev.two_factor_code &&
      dev.two_factor_expires &&
      new Date(dev.two_factor_expires) > new Date() &&
      String(dev.two_factor_code).trim() === String(twoFactorCode).trim();

    if (!isCodeValid) {
      const failInfo = await recordFailedLogin({
        table: 'developers',
        id: dev.id,
        ip,
        userAgent,
        reason: 'Invalid 2FA code',
        maxFailedAttempts: 5,
        lockoutMinutes: 15,
      });

      if (failInfo.isLockedNow) {
        const err = new Error(failInfo.error);
        err.status = 429;
        err.locked = true;
        throw err;
      }

      const err = new Error('Invalid or expired two-factor authentication code.');
      err.requires2FA = true;
      err.twoFactorRequired = true;
      err.twoFactorInvalid = true;
      err.status = 401;
      throw err;
    }

    await queryDb(
      `UPDATE developers SET two_factor_code = NULL, two_factor_expires = NULL WHERE id = $1`,
      [dev.id]
    );
  }

  if (dev.email_verified === false) {
    const err = new Error('Your developer account has not been verified yet. Please check your email for the activation link.');
    err.unverified = true;
    err.email = dev.email;
    err.status = 403;
    throw err;
  }

  if (dev.verification_token) {
    queryDb(`UPDATE developers SET verification_token = NULL, verification_token_expires = NULL WHERE id = $1`, [dev.id]).catch(() => {});
  }

  const token = generateToken({
    id: dev.id,
    email: dev.email,
  });

  await recordSuccessfulLogin({
    table: 'developers',
    id: dev.id,
    ip,
    userAgent,
  });

  try {
    await queryDb(
      `INSERT INTO developer_login_sessions (developer_id, token, ip_address, user_agent, expires_at, is_active)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE)
       ON CONFLICT (token) DO UPDATE SET is_active = TRUE, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days', last_active_at = CURRENT_TIMESTAMP`,
      [dev.id, token, ip, userAgent]
    );
  } catch (e) {
    console.warn('Notice saving login session:', e.message);
  }

  const developerProfile = {
    id: dev.id,
    name: dev.name,
    email: dev.email,
    phone: dev.phone,
    roleId: dev.role_id,
  };

  return {
    developer: developerProfile,
    admin: developerProfile, 
    token,
  };
}

export const authenticateAdmin = authenticateDeveloper;

const DeveloperMiddleware = {
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setDeveloperSessionCookie,
  clearDeveloperSessionCookie,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  authenticateDeveloper,
  authenticateAdmin,

  getDeveloperSession,
  getAdminSession,
  getAuthenticatedUser,
  getDeveloperUser,
  isDeveloper,
  isStaff,
  authenticateStaff,
  hasModulePermission,
  hasDeveloperPermission,
  requireDeveloperPermission,
};

export default DeveloperMiddleware;

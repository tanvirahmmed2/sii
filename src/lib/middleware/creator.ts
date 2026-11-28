import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, CREATOR_TOKEN, BASE_URL, BASE_DOMAIN, SITE_NAME, extractBaseDomain } from '../database/secret';
import { query, queryDb } from '../database/db';
import { sendEmail, buildStyledEmail } from '../database/mailer';
import {
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  generateSecureOtp,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
} from '../security/shield';
import {
  resolveWebsiteFromRequest,
  resolveWebsite,
  invalidateWebsiteCache,
  clearWebsiteCache,
} from './websiteResolver';
import {
  fetchCreatorCredential,
  fetchCreatorSessionById,
  fetchPanelSession,
  shouldTouchSessionActivity,
  invalidateCreatorCache,
} from '../redis/redisClient';

const DEFAULT_JWT_SECRET: string = JWT_SECRET || 'creator_jwt_secret_key_2026';
const CREATOR_COOKIE_NAME = CREATOR_TOKEN;

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

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function signJWT(payload: any, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn: expiresIn as any });
}

export function generateToken(payload: any, expiresIn: string | number = '7d'): string {
  return signJWT(payload, expiresIn);
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function setCreatorSessionCookie(response: any, token: string): Promise<void> {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };

  if (response && response.cookies) {
    response.cookies.set(CREATOR_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.set(CREATOR_COOKIE_NAME, token, cookieOptions);
    } catch (e) {}
  }
}

export async function clearCreatorSessionCookie(response: any): Promise<void> {
  if (response && response.cookies) {
    response.cookies.delete(CREATOR_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.delete(CREATOR_COOKIE_NAME);
    } catch (e) {}
  }
}

export async function getCreatorSession(request?: any): Promise<any> {
  try {
    let token: string | null = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(CREATOR_COOKIE_NAME)?.value || null;
      }
    }

    if (!token) {
      try {
        const cookieStore = await getCookieStore();
        token = cookieStore?.get(CREATOR_COOKIE_NAME)?.value || null;
      } catch (e) {}
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const c = await fetchCreatorSessionById(decoded.id, async () => {
      const res = await query(
        `SELECT *
         FROM creators
         WHERE id = $1 LIMIT 1`,
        [decoded.id]
      );
      return res.rows[0] || null;
    });

    if (!c || !c.is_active) return null;

    try {
      const sessState = await fetchPanelSession<{ active: boolean }>(
        'creator',
        token,
        [`creator:${c.id}`],
        async () => {
          const sessRes = await query(
            `SELECT is_active, expires_at FROM creator_login_sessions WHERE token = $1 AND creator_id = $2 LIMIT 1`,
            [token, c.id]
          );
          if (sessRes.rows.length === 0) {
            return { active: false };
          }
          const s = sessRes.rows[0];
          if (s.is_active === false) return { active: false };
          if (s.expires_at && new Date(s.expires_at) < new Date()) return { active: false };
          return { active: true };
        },
        180
      );

      if (!sessState || !sessState.active) return null;

      if (await shouldTouchSessionActivity('creator', token, 300)) {
        query(
          `UPDATE creator_login_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE token = $1`,
          [token]
        ).catch(() => {});
      }
    } catch (e) {
      console.error('Error verifying creator session against database:', e);
      return null;
    }

    return {
      id: Number(c.id),
      name: c.name,
      email: c.email,
      phone: c.phone,
      country: c.country || null,
      city: c.city || null,
      address: c.address || null,
      isActive: c.is_active,
      isVerified: c.is_verified || c.email_verified || false,
      two_factor_enabled: Boolean(c.two_factor_enabled),
      createdAt: c.created_at,
      token,
      is_admin: Boolean(c.is_admin || c.role === 'admin'),
      role: c.role || 'creator',
    };
  } catch (error) {
    console.error('Error getting creator session:', error);
    return null;
  }
}

export async function authenticateCreator(identifier: string, password: string, { ip = '127.0.0.1', userAgent = 'Unknown', twoFactorCode = null, channel = 'email' }: any = {}): Promise<any> {
  const raw = String(identifier || '').trim();
  if (!raw) {
    throw new Error('Email or phone number is required.');
  }

  const cleanEmail = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');

  const lockoutCheck = await checkAccountLockout({ table: 'creators', identifier: raw });
  if (lockoutCheck.isLocked) {
    const err: any = new Error(lockoutCheck.error);
    err.status = 429;
    err.locked = true;
    err.remainingMinutes = lockoutCheck.remainingMinutes;
    throw err;
  }

  const creator = await fetchCreatorCredential(raw, async () => {
    const res = await queryDb(
      `SELECT * FROM creators 
       WHERE LOWER(email) = $1 
          OR phone = $2 
          OR (LENGTH($3) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($3, 10))
       LIMIT 1`,
      [cleanEmail, raw, digits]
    );
    return res.rows[0] || null;
  });

  if (!creator) {
    throw new Error('No creator account found with this email or phone number.');
  }

  if (!creator.is_active) {
    try {
      await queryDb(
        `INSERT INTO creator_login_activities (creator_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, 'Failed', 'Account deactivated')`,
        [creator.id, ip, userAgent]
      );
    } catch (_) {}
    const err: any = new Error('Your creator account has been deactivated.');
    err.deactivated = true;
    err.status = 403;
    throw err;
  }

  if (!creator.password) {
    const err: any = new Error('No password is set for this account. Please use password recovery.');
    err.status = 400;
    throw err;
  }

  const isMatch = await comparePassword(password, creator.password);
  if (!isMatch) {
    const failInfo = await recordFailedLogin({
      table: 'creators',
      id: creator.id,
      ip,
      userAgent,
      reason: 'Incorrect password',
      maxFailedAttempts: 5,
      lockoutMinutes: 15,
    });

    if (failInfo.isLockedNow) {
      const err: any = new Error(failInfo.error);
      err.status = 429;
      err.locked = true;
      throw err;
    }

    const message = failInfo.warning
      ? `Incorrect password. ${failInfo.warning}`
      : 'Incorrect email or password.';
    throw new Error(message);
  }

  if (creator.two_factor_enabled) {
    if (!twoFactorCode) {
      const selectedChannel = 'email';

      const rateCheck = await checkOtpDispatchRateLimit({
        identifier: creator.email,
        phone: creator.phone,
        email: creator.email,
        ip,
      });

      if (!rateCheck.isAllowed) {
        const err: any = new Error(rateCheck.error);
        err.status = 429;
        err.rateLimited = true;
        err.remainingMinutes = rateCheck.remainingMinutes;
        err.requires2FA = true;
        err.twoFactorRequired = true;
        err.email = creator.email;
        err.phone = creator.phone;
        throw err;
      }

      const secureOtp = generateSecureOtp(6);
      await queryDb(
        `UPDATE creators 
         SET two_factor_code = $1, 
             two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [secureOtp, creator.id]
      );

      try {
        const emailHtml = buildStyledEmail({
          title: `${SITE_NAME} Security Verification`,
          subtitle: 'Creator Two-Factor Authentication',
          recipientName: creator.name || 'Creator',
          bodyParagraphs: [
            'A login request was initiated for your creator studio account.',
            'Enter the 6-digit verification code below to authorize your session.'
          ],
          code: secureOtp,
          codeLabel: 'Security Code',
          footerNote: 'This code is valid for 10 minutes. If you did not initiate this login, please secure your password immediately.'
        });

        await sendEmail({
          to: creator.email,
          toName: creator.name || 'Creator',
          subject: `Two-Factor Security Code: ${secureOtp} - ${SITE_NAME}`,
          html: emailHtml,
          text: `Your ${SITE_NAME} creator two-factor code is: ${secureOtp}. Valid for 10 minutes.`,
          recipientType: 'creator',
          recipientId: creator.id,
          purpose: 'creator_2fa',
          ip,
        });
        await recordOtpDispatch({
          identifier: creator.email,
          phone: creator.phone,
          email: creator.email,
          channel: 'email',
          purpose: '2fa',
          ip,
        });
      } catch (mailErr: any) {
        console.error('Creator 2FA email error:', mailErr.message);
        const err: any = new Error(`Failed to send verification email: ${mailErr.message || 'Email delivery failed.'}`);
        err.dispatchFailed = true;
        err.status = 500;
        throw err;
      }

      const err: any = new Error('Two-factor verification code sent via email to your registered email address.');
      err.requires2FA = true;
      err.twoFactorRequired = true;
      err.channel = selectedChannel;
      err.hasPhone = Boolean(creator.phone);
      err.hasEmail = Boolean(creator.email);
      err.status = 401;
      throw err;
    }

    const isCodeValid =
      creator.two_factor_code &&
      creator.two_factor_expires &&
      new Date(creator.two_factor_expires) > new Date() &&
      String(creator.two_factor_code).trim() === String(twoFactorCode).trim();

    if (!isCodeValid) {
      const failInfo = await recordFailedLogin({
        table: 'creators',
        id: creator.id,
        ip,
        userAgent,
        reason: 'Invalid 2FA code',
        maxFailedAttempts: 5,
        lockoutMinutes: 15,
      });

      if (failInfo.isLockedNow) {
        const err: any = new Error(failInfo.error);
        err.status = 429;
        err.locked = true;
        throw err;
      }

      const err: any = new Error('Invalid or expired two-factor authentication code.');
      err.requires2FA = true;
      err.twoFactorRequired = true;
      err.twoFactorInvalid = true;
      err.status = 401;
      throw err;
    }

    await queryDb(
      `UPDATE creators SET two_factor_code = NULL, two_factor_expires = NULL WHERE id = $1`,
      [creator.id]
    );
  }

  const isVerified = Boolean(creator.email_verified || creator.is_verified);
  if (!isVerified) {
    const err: any = new Error('Please verify your email address to access your creator studio.');
    err.unverified = true;
    err.email = creator.email;
    err.status = 403;
    throw err;
  }

  const token = generateToken({
    id: Number(creator.id),
    email: creator.email,
    role: 'creator',
    type: 'creator',
  });

  await recordSuccessfulLogin({
    table: 'creators',
    id: creator.id,
    ip,
    userAgent,
  });

  try {
    await queryDb(
      `INSERT INTO creator_login_sessions (creator_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [creator.id, token, ip, userAgent]
    );
  } catch (e: any) {
    console.warn('Notice saving creator login session:', e.message);
  }

  await setCreatorSessionCookie(null, token);

  return {
    creator: {
      id: Number(creator.id),
      name: creator.name,
      email: creator.email,
      phone: creator.phone,
      isVerified: true,
      emailVerified: true,
    },
    token,
  };
}

export const WEBSITE_AUTH_COOKIE = 'website_user_token';

export function generateWebsiteToken(payload: any, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyWebsiteToken(token: string): any {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch {
    return null;
  }
}

export {
  resolveWebsiteFromRequest,
  resolveWebsite,
  invalidateWebsiteCache,
  clearWebsiteCache,
};

export async function getWebsiteUserSession(request?: any): Promise<any> {
  try {
    let token: string | null = null;
    const authHeader = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request?.cookies?.get) {
      token = request.cookies.get(WEBSITE_AUTH_COOKIE)?.value || null;
    }
    if (!token) {
      try {
        const cookieStore = await getCookieStore();
        token = cookieStore?.get(WEBSITE_AUTH_COOKIE)?.value || null;
      } catch {}
    }
    if (!token) return null;

    const decoded = verifyWebsiteToken(token);
    if (!decoded?.id) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getUserRolesAndPermissions(userId: any, websiteId: any): Promise<any[]> {
  try {
    const res = await query(
      `SELECT cm.slug as module, wmp.can_view, wmp.can_create, wmp.can_edit, wmp.can_delete
       FROM website_modules_permissions wmp
       JOIN website_control_modules cm ON cm.id = COALESCE(wmp.control_module_id, wmp.website_module_id)
       WHERE wmp.staff_id = $1 AND wmp.website_id = $2`,
      [userId, websiteId]
    );
    return res.rows;
  } catch {
    return [];
  }
}

const CreatorMiddleware = {
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setCreatorSessionCookie,
  clearCreatorSessionCookie,
  getCreatorSession,
  authenticateCreator,
  resolveWebsiteFromRequest,
  getWebsiteUserSession,
  getUserRolesAndPermissions,
};

export default CreatorMiddleware;

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryDb } from '../database/db.js';
import { JWT_SECRET, STAFF_TOKEN } from '../database/secret.js';
import {
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  generateSecureOtp,
} from '../security/shield.js';
import { sendEmail, buildStyledEmail } from '../database/brevo.js';
import { sendSms } from '../database/smsSender.js';

const DEFAULT_JWT_SECRET = JWT_SECRET;

export const STAFF_COOKIE_NAME = STAFF_TOKEN;

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(String(password), String(hash));
  } catch {
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

export async function setStaffSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, 
  };

  if (response && response.cookies) {
    response.cookies.set(STAFF_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.set(STAFF_COOKIE_NAME, token, cookieOptions);
    } catch {}
  }
}

export async function clearStaffSessionCookie(response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };

  if (response && response.cookies) {
    response.cookies.set(STAFF_COOKIE_NAME, '', cookieOptions);
    response.cookies.delete?.(STAFF_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.delete(STAFF_COOKIE_NAME);
    } catch {}
  }
}

export async function getStaffSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(STAFF_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    let sessRes = await queryDb(
      `SELECT ss.id AS session_id, ss.website_id, ss.staff_id, ss.is_active, ss.expires_at,
              ws.id, ws.name, ws.email, ws.number, ws.phone, ws.address, ws.is_active AS staff_active,
              ws.is_registered, ws.is_two_factor_enabled, ws.image, ws.image_id, ws.grade_id,
              ws.date_of_birth, ws.nationality, ws.blood_group, ws.gender, ws.nid_number,
              ws.bio, ws.username,
              w.name AS website_name,
              COALESCE((SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1), w.slug) AS website_subdomain,
              (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS website_custom_domain
       FROM staff_sessions ss
       JOIN website_staffs ws ON ws.id = ss.staff_id
       JOIN websites w ON w.id = ss.website_id
       WHERE ss.token = $1 AND ss.is_active = TRUE AND ss.expires_at > CURRENT_TIMESTAMP AND ws.is_active = TRUE
       LIMIT 1`,
      [token]
    );

    if (sessRes.rows.length === 0) {
      const staffCheck = await queryDb(
        `SELECT ws.*, w.id AS web_id, w.name AS website_name,
                COALESCE((SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1), w.slug) AS website_subdomain,
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS website_custom_domain
         FROM website_staffs ws
         JOIN websites w ON w.id = ws.website_id
         WHERE ws.id = $1 AND ws.is_active = TRUE
         LIMIT 1`,
        [decoded.id]
      );

      if (staffCheck.rows.length > 0) {
        const staffRow = staffCheck.rows[0];
        try {
          await queryDb(
            `INSERT INTO staff_sessions (website_id, staff_id, token, expires_at, is_active)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE)
             ON CONFLICT (token) DO UPDATE SET is_active = TRUE, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days'`,
            [staffRow.web_id, staffRow.id, token]
          );

          sessRes = await queryDb(
            `SELECT ss.id AS session_id, ss.website_id, ss.staff_id, ss.is_active, ss.expires_at,
                    ws.id, ws.name, ws.email, ws.number, ws.phone, ws.address, ws.is_active AS staff_active,
                    ws.is_registered, ws.is_two_factor_enabled, ws.image, ws.image_id, ws.grade_id,
                    ws.date_of_birth, ws.nationality, ws.blood_group, ws.gender, ws.nid_number,
                    ws.bio, ws.username,
                    w.name AS website_name,
              COALESCE((SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1), w.slug) AS website_subdomain,
              (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS website_custom_domain
             FROM staff_sessions ss
             JOIN website_staffs ws ON ws.id = ss.staff_id
             JOIN websites w ON w.id = ss.website_id
             WHERE ss.token = $1 AND ss.is_active = TRUE LIMIT 1`,
            [token]
          );
        } catch {
        }
      }
    }

    if (sessRes.rows.length === 0) return null;
    const row = sessRes.rows[0];

    queryDb(
      `UPDATE staff_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.session_id]
    ).catch(() => {});

    const permsRes = await queryDb(
      `SELECT COALESCE(wmp.control_module_id, wmp.website_module_id) AS control_module_id,
              wmp.can_view, wmp.can_create, wmp.can_edit, wmp.can_delete,
              cm.name AS module_name, cm.slug AS module_slug, cm.icon AS module_icon
       FROM website_modules_permissions wmp
       JOIN website_control_modules cm ON cm.id = COALESCE(wmp.control_module_id, wmp.website_module_id)
       JOIN websites w ON w.id = wmp.website_id
       LEFT JOIN subscriptions s ON (s.id = w.subscription_id OR s.website_id = w.id)
       WHERE wmp.staff_id = $1 AND wmp.website_id = $2 AND cm.is_active = TRUE
         AND (
           EXISTS (
             SELECT 1 FROM package_control_modules pcm 
             WHERE pcm.package_id = s.package_id AND pcm.control_module_id = cm.id
           )
           OR s.package_id IS NULL
         )`,
      [row.id, row.website_id]
    );

    const permissions = {};
    const allowedModules = [];

    for (const p of permsRes.rows) {
      permissions[p.module_slug] = {
        can_view: Boolean(p.can_view),
        can_create: Boolean(p.can_create),
        can_edit: Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
        module_name: p.module_name,
        website_module_id: p.website_module_id,
        module_icon: p.module_icon,
      };
      if (p.can_view) {
        allowedModules.push(p.module_slug);
      }
    }

    const staffUser = {
      id: row.id,
      staff_id: row.id,
      websiteId: row.website_id,
      website_id: row.website_id,
      name: row.name,
      email: row.email,
      number: row.phone || row.number,
      phone: row.phone || row.number,
      address: row.address,
      isActive: Boolean(row.staff_active),
      isRegistered: Boolean(row.is_registered),
      isTwoFactorEnabled: Boolean(row.is_two_factor_enabled),
      image: row.image,
      imageId: row.image_id,
      gradeId: row.grade_id,
      dateOfBirth: row.date_of_birth,
      nationality: row.nationality,
      bloodGroup: row.blood_group,
      gender: row.gender,
      nidNumber: row.nid_number,
      bio: row.bio,
      username: row.username,
      websiteName: row.website_name,
      websiteSubdomain: row.website_subdomain,
      websiteCustomDomain: row.website_custom_domain,
      permissions,
      allowedModules,
      token,
      sessionId: row.session_id,
    };

    return {
      staff: staffUser,
      user: staffUser,
      website_id: row.website_id,
      websiteId: row.website_id,
      staff_id: row.id,
      staffId: row.id,
      session: {
        id: row.session_id,
        websiteId: row.website_id,
        website_id: row.website_id,
        token,
        expiresAt: row.expires_at,
      },
      permissions,
      allowedModules,
    };
  } catch (err) {
    console.error('Error fetching staff session:', err);
    return null;
  }
}

export async function getStaffUser(request) {
  const sessionData = await getStaffSession(request);
  return sessionData ? sessionData.staff : null;
}

export async function isStaff(request) {
  const sessionData = await getStaffSession(request);
  return Boolean(sessionData && sessionData.staff && sessionData.staff.isActive);
}

export function hasStaffModulePermission(staffOrSession, moduleSlug, action = 'view') {
  if (!staffOrSession || !moduleSlug) return false;
  const staff = staffOrSession.staff || staffOrSession;
  const permissions = staff.permissions || {};
  const modPerm = permissions[moduleSlug];
  if (!modPerm) return false;

  switch (action) {
    case 'create':
      return Boolean(modPerm.can_create);
    case 'edit':
    case 'update':
      return Boolean(modPerm.can_edit);
    case 'delete':
      return Boolean(modPerm.can_delete);
    case 'view':
    default:
      return Boolean(modPerm.can_view);
  }
}

export async function createStaffSession({ websiteId, staffId, token, request, expiresAt }) {
  try {
    let ip = null;
    let userAgent = null;

    if (request) {
      ip = request.headers?.get?.('x-forwarded-for') || request.headers?.get?.('x-real-ip') || null;
      if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
      userAgent = request.headers?.get?.('user-agent') || null;
    }

    const exp = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await queryDb(
      `INSERT INTO staff_sessions (website_id, staff_id, token, ip_address, user_agent, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       ON CONFLICT (token) DO UPDATE SET
         is_active = TRUE,
         expires_at = EXCLUDED.expires_at,
         last_active_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [websiteId, staffId, token, ip, userAgent, exp]
    );

    return res.rows[0];
  } catch (err) {
    console.error('Error creating staff session:', err);
    return null;
  }
}

export async function revokeStaffSession(token) {
  try {
    if (!token) return false;
    await queryDb(`UPDATE staff_sessions SET is_active = FALSE WHERE token = $1`, [token]);
    return true;
  } catch (err) {
    console.error('Error revoking staff session:', err);
    return false;
  }
}

export async function revokeAllStaffSessions(staffId, websiteId = null) {
  try {
    if (!staffId) return false;
    if (websiteId) {
      await queryDb(
        `UPDATE staff_sessions SET is_active = FALSE WHERE staff_id = $1 AND website_id = $2`,
        [staffId, websiteId]
      );
    } else {
      await queryDb(`UPDATE staff_sessions SET is_active = FALSE WHERE staff_id = $1`, [staffId]);
    }
    return true;
  } catch (err) {
    console.error('Error revoking all staff sessions:', err);
    return false;
  }
}

export async function isCashier(request) {
  const staff = await getStaffUser(request);
  return Boolean(staff?.permissions?.fees?.can_view || staff?.permissions?.accounting?.can_view);
}

export async function isRegister(request) {
  const staff = await getStaffUser(request);
  return Boolean(staff?.permissions?.sis?.can_view || staff?.permissions?.routine?.can_view);
}

export async function isGeneralStaff(request) {
  const staff = await getStaffUser(request);
  return Boolean(staff && (staff.isActive || staff.is_active));
}

export async function isStaffRole(request) {
  const staff = await getStaffUser(request);
  return Boolean(staff && (staff.isActive || staff.is_active));
}

export async function verifyStaffModuleAccess(request, context, moduleSlug, action = 'view') {
  const { resolveWebsiteFromRequest, hasTenantModuleAllowance } = await import('./websiteResolver.js');
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  const hasAllowance = await hasTenantModuleAllowance(website, moduleSlug);
  if (!hasAllowance) {
    return {
      error: `The '${moduleSlug}' module is not included in this institution's subscription plan.`,
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff authentication required.', status: 401, code: 'UNAUTHORIZED' };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403, code: 'FORBIDDEN_CROSS_TENANT' };
  }

  const hasPerm = hasStaffModulePermission(staffSession, moduleSlug, action);
  if (!hasPerm) {
    return {
      error: `Access Denied: You do not have permission to ${action} records in the '${moduleSlug}' module.`,
      status: 403,
      code: 'PERMISSION_DENIED',
      website,
      staffSession,
    };
  }

  return {
    website,
    staffSession,
    staff: staffSession.staff || staffSession.user,
    allowed: true,
  };
}

export function checkStaffContactsPermission(staffSession, action = 'view') {
  if (!staffSession) return false;
  const staff = staffSession.staff || staffSession.user || staffSession;
  if (!staff) return false;

  const perms = staff.permissions || staffSession.permissions || {};
  if (Object.keys(perms).length === 0) {
    return true;
  }

  if (hasStaffModulePermission(staffSession, 'communications', action)) {
    return true;
  }

  if (hasStaffModulePermission(staffSession, 'website-builder', action)) {
    return true;
  }

  if (hasStaffModulePermission(staffSession, 'contacts', action)) {
    return true;
  }

  return false;
}

export async function authenticateStaff({
  websiteId,
  identifier,
  password,
  ip = '127.0.0.1',
  userAgent = 'Unknown',
  twoFactorCode = null,
  channel = 'email',
  request = null,
  website = null,
} = {}) {
  const raw = String(identifier || '').trim();
  const cleanEmail = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');
  const cleanPassword = String(password || '');

  const lockoutCheck = await checkAccountLockout({
    table: 'website_staffs',
    identifier: raw,
    websiteId,
  });

  if (lockoutCheck.isLocked) {
    const err = new Error(lockoutCheck.error);
    err.status = 429;
    err.locked = true;
    err.remainingMinutes = lockoutCheck.remainingMinutes;
    throw err;
  }

  const staffRes = await queryDb(
    `SELECT ws.id, ws.website_id, ws.name, ws.email, ws.number, COALESCE(ws.phone, ws.number) AS phone,
            ws.address, ws.password, ws.is_active, ws.is_registered, ws.is_two_factor_enabled,
            ws.two_factor_code, ws.two_factor_expires, ws.grade_id, ws.username, ws.bio,
            gp.name AS grade_name, gp.basic_salary, gp.allowance
     FROM website_staffs ws
     LEFT JOIN website_staff_pay_scale gp ON gp.id = ws.grade_id
     WHERE ws.website_id = $1 
       AND (
         LOWER(ws.email) = $2 
         OR ws.number = $3 
         OR ws.phone = $3 
         OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(ws.phone, ws.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
       )
     LIMIT 1`,
    [websiteId, cleanEmail, raw, digits]
  );

  if (staffRes.rows.length === 0) {
    throw new Error('Invalid email, phone number, or password.');
  }

  const staff = staffRes.rows[0];

  if (!staff.is_active) {
    try {
      await queryDb(
        `INSERT INTO website_staff_login_activities (website_id, staff_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, $4, 'Failed', 'Account deactivated')`,
        [websiteId, staff.id, ip, userAgent]
      );
    } catch (_) {}
    const err = new Error('Your staff account has been deactivated. Please contact campus administration.');
    err.deactivated = true;
    err.status = 403;
    throw err;
  }

  const isMatch = await comparePassword(cleanPassword, staff.password);
  if (!isMatch) {
    const failInfo = await recordFailedLogin({
      table: 'website_staffs',
      id: staff.id,
      websiteId,
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

  if (staff.is_two_factor_enabled) {
    if (!twoFactorCode) {
      const selectedChannel = String(channel || 'email').toLowerCase() === 'sms' ? 'sms' : 'email';

      const rateCheck = await checkOtpDispatchRateLimit({
        identifier: staff.email,
        phone: staff.phone || staff.number,
        email: staff.email,
        ip,
      });

      if (!rateCheck.isAllowed) {
        const err = new Error(rateCheck.error);
        err.status = 429;
        err.rateLimited = true;
        err.remainingMinutes = rateCheck.remainingMinutes;
        err.requires2FA = true;
        err.twoFactorRequired = true;
        err.email = staff.email;
        err.phone = staff.phone || staff.number;
        throw err;
      }

      const secureOtp = generateSecureOtp(6);
      await queryDb(
        `UPDATE website_staffs 
         SET two_factor_code = $1, 
             two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [secureOtp, staff.id]
      );

      await recordOtpDispatch({
        identifier: staff.email,
        phone: staff.phone || staff.number,
        email: staff.email,
        channel: selectedChannel,
        purpose: 'staff_2fa',
        ip,
      });

      const institutionName = website?.name || 'Institution Staff Portal';

      if (selectedChannel === 'sms') {
        const targetPhone = staff.phone || staff.number;
        if (!targetPhone) {
          const err = new Error('No phone number is registered for SMS verification on this staff account.');
          err.status = 400;
          throw err;
        }
        try {
          await sendSms({
            to: targetPhone,
            message: `Your ${institutionName} staff 2FA security code is: ${secureOtp}. Valid for 10 minutes.`,
            purpose: '2fa',
            userId: staff.id,
            userType: 'staff',
            ip,
            websiteId,
          });
        } catch (smsErr) {
          const err = new Error(smsErr.message || 'Failed to dispatch 2FA SMS code.');
          err.dispatchFailed = true;
          throw err;
        }
      } else {
        try {
          const html = buildStyledEmail({
            title: 'Staff Security Verification',
            subtitle: `${institutionName} — Staff Operations Portal`,
            recipientName: staff.name,
            bodyParagraphs: [
              'A login request to your staff portal was detected. Please use the verification code below to complete your authentication.',
              'This security code will expire in 10 minutes. If you did not initiate this request, please contact your systems administrator immediately.',
            ],
            code: secureOtp,
            codeLabel: 'Two-Factor Authentication Code',
          });

          await sendEmail({
            to: staff.email,
            toName: staff.name,
            subject: `${institutionName} - Staff Portal Login Verification Code`,
            html,
            websiteId,
          });
        } catch (mailErr) {
          const err = new Error(mailErr.message || 'Failed to dispatch 2FA email code.');
          err.dispatchFailed = true;
          throw err;
        }
      }

      const err = new Error(`Two-factor verification code sent to your registered ${selectedChannel === 'sms' ? 'phone number via SMS' : 'email address'}.`);
      err.requires2FA = true;
      err.twoFactorRequired = true;
      err.channel = selectedChannel;
      err.hasPhone = Boolean(staff.phone || staff.number);
      err.hasEmail = Boolean(staff.email);
      err.email = staff.email;
      err.phone = staff.phone || staff.number;
      throw err;
    }

    const clean2Fa = String(twoFactorCode).trim();
    if (staff.two_factor_code !== clean2Fa) {
      throw new Error('Invalid two-factor verification code. Please check and try again.');
    }

    if (!staff.two_factor_expires || new Date(staff.two_factor_expires) < new Date()) {
      throw new Error('Two-factor verification code has expired. Please request a new code.');
    }

    await queryDb(
      `UPDATE website_staffs 
       SET two_factor_code = NULL, 
           two_factor_expires = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [staff.id]
    );
  }

  await recordSuccessfulLogin({
    table: 'website_staffs',
    id: staff.id,
    websiteId,
    ip,
    userAgent,
  });

  const token = generateToken({
    id: staff.id,
    email: staff.email,
    websiteId,
    name: staff.name,
  });

  await createStaffSession({
    websiteId,
    staffId: staff.id,
    token,
    request,
  });

  const staffData = {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    number: staff.number,
    phone: staff.phone || staff.number,
    address: staff.address,
    username: staff.username,
    gradeId: staff.grade_id,
    gradeName: staff.grade_name || null,
    designation: staff.grade_name || 'Staff Member',
    isTwoFactorEnabled: Boolean(staff.is_two_factor_enabled),
    isActive: Boolean(staff.is_active),
  };

  return {
    staff: staffData,
    token,
  };
}

const StaffMiddleware = {
  STAFF_COOKIE_NAME,
  authenticateStaff,
  getStaffSession,
  getStaffUser,
  isStaff,
  isCashier,
  isRegister,
  isGeneralStaff,
  isStaffRole,
  hasStaffModulePermission,
  checkStaffContactsPermission,
  verifyStaffModuleAccess,
  createStaffSession,
  revokeStaffSession,
  revokeAllStaffSessions,
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setStaffSessionCookie,
  clearStaffSessionCookie,
};

export default StaffMiddleware;

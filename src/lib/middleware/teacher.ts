import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryDb } from '../database/db';
import { JWT_SECRET, getTeacherToken } from '../database/secret';
import { getCookieStore, resolveTenantCookieName } from './tenantCookie';
import {
  fetchPanelSession,
  invalidatePanelSessionsByTag,
} from '../redis/redisClient';
import { sendEmail, buildStyledEmail } from '../database/mailer';
import {
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  generateSecureOtp,
  checkRateLimit,
  extractClientIp,
} from '../security/shield';

const DEFAULT_JWT_SECRET: string = JWT_SECRET || 'teacher_jwt_secret_key_2026';
export const getTeacherCookieName = getTeacherToken;

export async function hashPassword(password: string): Promise<string> {
  if (!password) throw new Error('Password is required for hashing.');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(String(password), String(hash));
  } catch {
    return false;
  }
}

export function signJWT(payload: any, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn: expiresIn as any });
}

export function generateToken(payload: any, expiresIn: string | number = '7d'): string {
  const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return signJWT({ ...payload, jti }, expiresIn);
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch {
    return null;
  }
}

export async function setTeacherSessionCookie(
  response: any,
  token: string,
  requestOrDomain?: any,
  explicitDomain?: string | null
): Promise<void> {
  const cookieName = await resolveTenantCookieName('teacher', requestOrDomain, explicitDomain);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };

  if (response && response.cookies) {
    response.cookies.set(cookieName, token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.set(cookieName, token, cookieOptions);
    } catch {}
  }
}

export async function clearTeacherSessionCookie(
  response: any,
  requestOrDomain?: any,
  explicitDomain?: string | null
): Promise<void> {
  const cookieName = await resolveTenantCookieName('teacher', requestOrDomain, explicitDomain);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  if (response && response.cookies) {
    response.cookies.set(cookieName, '', cookieOptions);
    response.cookies.delete?.(cookieName);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.delete(cookieName);
    } catch {}
  }
}

export async function createTeacherSession({ websiteId, teacherId, token, request, expiresAt }: any): Promise<any> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      ip = request.headers?.get?.('x-forwarded-for') || request.headers?.get?.('x-real-ip') || null;
      if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
      userAgent = request.headers?.get?.('user-agent') || null;
    }

    const exp = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await queryDb(
      `INSERT INTO website_teacher_login_sessions (website_id, teacher_id, token, ip_address, user_agent, expires_at, is_revoked)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING id`,
      [websiteId, teacherId, token, ip, userAgent, exp]
    );

    return res.rows[0]?.id || null;
  } catch (error) {
    return null;
  }
}

export async function revokeAllTeacherSessions(websiteId: any, teacherId: any): Promise<void> {
  try {
    await queryDb(
      `UPDATE website_teacher_login_sessions
       SET is_revoked = TRUE
       WHERE website_id = $1 AND teacher_id = $2`,
      [websiteId, teacherId]
    );
    await invalidatePanelSessionsByTag('teacher', `teacher:${teacherId}`);
  } catch (error) {
  }
}

export async function authenticateTeacher({
  identifier,
  password,
  websiteId,
  channel = 'email',
  twoFactorCode = null,
  request = null,
  website = null,
}: any): Promise<any> {
  const cleanId = String(identifier || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanId || !cleanPassword) {
    throw new Error('Email or phone number and password are required.');
  }

  if (!websiteId) {
    throw new Error('Website ID context is required for authentication.');
  }

  const ip = extractClientIp(request);
  const userAgent = request?.headers?.get?.('user-agent') || 'Unknown';

  const rateCheck = await checkRateLimit({
    ip,
    identifier: cleanId,
    action: 'teacher_auth',
    maxAttempts: 15,
    windowSeconds: 60,
  });
  if (!rateCheck.isAllowed) {
    const err: any = new Error(rateCheck.error || 'Too many login attempts. Please wait a moment.');
    err.status = 429;
    throw err;
  }

  const lockoutCheck = await checkAccountLockout({
    table: 'website_teachers',
    identifier: cleanId,
    websiteId,
  });
  if (lockoutCheck.isLocked) {
    const err: any = new Error(lockoutCheck.error);
    err.status = 429;
    err.locked = true;
    err.remainingSeconds = lockoutCheck.remainingSeconds;
    err.remainingMinutes = lockoutCheck.remainingMinutes;
    throw err;
  }

  const cleanEmail = cleanId.toLowerCase();
  const raw = cleanId;
  const digits = raw.replace(/\D/g, '');

  const teacherRes = await queryDb(
    `SELECT wt.id, wt.website_id, wt.department_id, wt.designation_id, wt.name, wt.email, wt.number,
            COALESCE(wt.phone, wt.number) AS phone, wt.emergency_contact, wt.gender, wt.blood_group,
            wt.date_of_birth, wt.religion, wt.address, wt.permanent_address, wt.joining_date,
            wt.salary, wt.photo_url, wt.photo_id, wt.password, wt.is_active, wt.is_registered,
            wt.is_two_factor_enabled, wt.two_factor_code, wt.two_factor_expires,
            wd.title AS designation_title,
            dept.name AS department_name
     FROM website_teachers wt
     LEFT JOIN website_teacher_designation wd ON wd.id = wt.designation_id
     LEFT JOIN website_departments dept ON dept.id = wt.department_id
     WHERE wt.website_id = $1 AND (
       LOWER(wt.email) = $2 
       OR wt.number = $3 
       OR wt.phone = $3 
       OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(wt.phone, wt.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
     )
     LIMIT 1`,
    [websiteId, cleanEmail, raw, digits]
  );

  if (teacherRes.rows.length === 0) {
    throw new Error('Invalid email, phone number, or password.');
  }

  const teacher = teacherRes.rows[0];

  if (!teacher.is_active) {
    try {
      await queryDb(
        `INSERT INTO website_teacher_login_activities (website_id, teacher_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, $4, 'Failed', 'Account deactivated')`,
        [websiteId, teacher.id, ip, userAgent]
      );
    } catch (_) {}
    const err: any = new Error('Your teacher account is deactivated. Please contact campus administration.');
    err.deactivated = true;
    err.status = 403;
    throw err;
  }

  if (!teacher.is_registered) {
    const err: any = new Error('Your account is pending onboarding verification. Please check your invitation link.');
    err.pendingVerification = true;
    err.status = 403;
    throw err;
  }

  const isMatch = await comparePassword(cleanPassword, teacher.password);
  if (!isMatch) {
    const failInfo = await recordFailedLogin({
      table: 'website_teachers',
      id: teacher.id,
      websiteId,
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
      ? `Invalid password. ${failInfo.warning}`
      : 'Invalid email, phone number, or password.';
    throw new Error(message);
  }

  if (teacher.is_two_factor_enabled) {
    if (!twoFactorCode) {
      const selectedChannel = 'email';

      const rateCheck = await checkOtpDispatchRateLimit({
        identifier: teacher.email,
        phone: teacher.phone || teacher.number,
        email: teacher.email,
        ip,
      });

      if (!rateCheck.isAllowed) {
        const err: any = new Error(rateCheck.error);
        err.status = 429;
        err.rateLimited = true;
        err.remainingMinutes = rateCheck.remainingMinutes;
        err.requires2FA = true;
        err.twoFactorRequired = true;
        err.email = teacher.email;
        err.phone = teacher.phone || teacher.number;
        throw err;
      }

      if (!teacher.email) {
        const err: any = new Error('No email address is registered for two-factor verification on this teacher account.');
        err.status = 400;
        throw err;
      }

      const secureOtp = generateSecureOtp(6);
      await queryDb(
        `UPDATE website_teachers 
         SET two_factor_code = $1, 
             two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [secureOtp, teacher.id]
      );

      await recordOtpDispatch({
        identifier: teacher.email,
        phone: teacher.phone || teacher.number,
        email: teacher.email,
        channel: selectedChannel,
        purpose: 'teacher_2fa',
        ip,
      });

      const institutionName = website?.name || 'Institution Teacher Portal';

      try {
        const html = buildStyledEmail({
          title: 'Teacher Security Verification',
          subtitle: `${institutionName} — Faculty Operations Portal`,
          institutionName,
          recipientName: teacher.name,
          bodyParagraphs: [
            'A login request to your faculty dashboard was detected.',
            'Please use the verification code below to complete your authentication. This security code will expire in 10 minutes.',
          ],
          code: secureOtp,
          codeLabel: 'Two-Factor Authentication Code',
        });

        await sendEmail({
          to: teacher.email,
          toName: teacher.name,
          fromName: institutionName,
          subject: `${institutionName} - Teacher Portal Login Verification Code`,
          html,
          text: `Your ${institutionName} teacher two-factor verification code is: ${secureOtp}. Valid for 10 minutes.`,
          websiteId,
          recipientType: 'teacher',
          recipientId: teacher.id,
          purpose: 'teacher_2fa',
          ip,
        });
      } catch (mailErr: any) {
        const err: any = new Error(mailErr.message || 'Failed to dispatch 2FA email code.');
        err.dispatchFailed = true;
        throw err;
      }

      const err: any = new Error('Two-factor verification code sent to your registered email address.');
      err.requires2FA = true;
      err.twoFactorRequired = true;
      err.channel = selectedChannel;
      err.hasPhone = Boolean(teacher.phone || teacher.number);
      err.hasEmail = Boolean(teacher.email);
      err.email = teacher.email;
      err.phone = teacher.phone || teacher.number;
      throw err;
    }

    const clean2Fa = String(twoFactorCode).trim();
    if (teacher.two_factor_code !== clean2Fa) {
      throw new Error('Invalid two-factor verification code. Please check and try again.');
    }

    if (!teacher.two_factor_expires || new Date(teacher.two_factor_expires) < new Date()) {
      throw new Error('Two-factor verification code has expired. Please request a new code.');
    }

    await queryDb(
      `UPDATE website_teachers 
       SET two_factor_code = NULL, 
           two_factor_expires = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [teacher.id]
    );
  }

  await recordSuccessfulLogin({
    table: 'website_teachers',
    id: teacher.id,
    websiteId,
    ip,
    userAgent,
  });

  const token = generateToken({
    id: teacher.id,
    email: teacher.email,
    websiteId,
    name: teacher.name,
  });

  await createTeacherSession({
    websiteId,
    teacherId: teacher.id,
    token,
    request,
  });

  const teacherData = {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    number: teacher.phone || teacher.number,
    phone: teacher.phone || teacher.number,
    address: teacher.address,
    designation: teacher.designation_title || 'Teacher',
    designationId: teacher.designation_id,
    departmentId: teacher.department_id,
    departmentName: teacher.department_name,
    photoUrl: teacher.photo_url,
    photoId: teacher.photo_id,
    isActive: Boolean(teacher.is_active),
    isRegistered: Boolean(teacher.is_registered),
    isTwoFactorEnabled: Boolean(teacher.is_two_factor_enabled),
  };

  return {
    teacher: teacherData,
    token,
  };
}

export async function getTeacherSession(request?: any): Promise<any> {
  try {
    let token: string | null = null;
    const cookieName = await resolveTenantCookieName('teacher', request);

    if (request && typeof request !== 'string') {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(cookieName)?.value || null;
      }
    }

    if (!token) {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        token = cookieStore.get(cookieName)?.value || null;
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const tags = [`teacher:${decoded.id}`];
    if (decoded.websiteId) tags.push(`web:${decoded.websiteId}`);

    return await fetchPanelSession<any>(
      'teacher',
      token,
      tags,
      async () => {
        const res = await queryDb(
          `SELECT wt.id, wt.website_id, wt.department_id, wt.designation_id, wt.name, wt.email, wt.number,
                  COALESCE(wt.phone, wt.number) AS phone, wt.emergency_contact, wt.gender, wt.blood_group,
                  wt.date_of_birth, wt.religion, wt.address, wt.permanent_address, wt.joining_date,
                  wt.salary, wt.photo_url, wt.photo_id, wt.is_active, wt.is_registered, wt.created_at,
                  wd.title AS designation_title,
                  dept.name AS department_name, dept.code AS department_code,
                  w.name AS website_name,
                  COALESCE((SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1), w.slug) AS website_subdomain,
                  (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS website_custom_domain
           FROM website_teachers wt
           LEFT JOIN website_teacher_designation wd ON wd.id = wt.designation_id
           LEFT JOIN website_departments dept ON dept.id = wt.department_id
           LEFT JOIN websites w ON w.id = wt.website_id
           WHERE wt.id = $1 LIMIT 1`,
          [decoded.id]
        );

        if (res.rows.length === 0) return null;
        const teacher = res.rows[0];

        if (!teacher.is_active || !teacher.is_registered) return null;

        try {
          const sessRes = await queryDb(
            `SELECT id, is_revoked, expires_at 
             FROM website_teacher_login_sessions 
             WHERE token = $1 LIMIT 1`,
            [token]
          );
          if (sessRes.rows.length > 0) {
            const sess = sessRes.rows[0];
            if (sess.is_revoked) return null;
            if (sess.expires_at && new Date(sess.expires_at) < new Date()) return null;
          }
        } catch {}

        const teacherData = {
          id: teacher.id,
          websiteId: teacher.website_id,
          website_id: teacher.website_id,
          name: teacher.name,
          email: teacher.email,
          number: teacher.phone || teacher.number,
          phone: teacher.phone || teacher.number,
          address: teacher.address,
          permanentAddress: teacher.permanent_address,
          emergencyContact: teacher.emergency_contact,
          designation: teacher.designation_title || 'Teacher',
          designationId: teacher.designation_id,
          departmentId: teacher.department_id,
          departmentName: teacher.department_name,
          departmentCode: teacher.department_code,
          photoUrl: teacher.photo_url,
          photoId: teacher.photo_id,
          isActive: Boolean(teacher.is_active),
          isRegistered: Boolean(teacher.is_registered),
          websiteName: teacher.website_name,
          websiteSubdomain: teacher.website_subdomain,
          websiteCustomDomain: teacher.website_custom_domain,
        };

        return {
          teacher: teacherData,
          user: teacherData,
          id: teacher.id,
          email: teacher.email,
          name: teacher.name,
          website_id: teacher.website_id,
          websiteId: teacher.website_id,
          isActive: Boolean(teacher.is_active),
          isRegistered: Boolean(teacher.is_registered),
          token,
        };
      },
      180
    );
  } catch (error) {
    return null;
  }
}

export const getTeacherUser = async (request?: any): Promise<any> => {
  const session = await getTeacherSession(request);
  return session?.teacher || null;
};

export async function isTeacher(request?: any): Promise<boolean> {
  try {
    const session = await getTeacherSession(request);
    return Boolean(session && session.isActive && session.isRegistered);
  } catch {
    return false;
  }
}

export async function requireTeacher(request?: any): Promise<any> {
  const session = await getTeacherSession(request);
  if (!session || !session.isActive) {
    return { error: 'Unauthorized: Teacher authentication required.', status: 401 };
  }
  return { teacher: session.teacher, session };
}

const TeacherMiddleware = {
  getTeacherCookieName,
  authenticateTeacher,
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setTeacherSessionCookie,
  clearTeacherSessionCookie,
  createTeacherSession,
  revokeAllTeacherSessions,
  getTeacherSession,
  getTeacherUser,
  isTeacher,
  requireTeacher,
};

export default TeacherMiddleware;

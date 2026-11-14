import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryDb } from '../database/db.js';
import { JWT_SECRET, STUDENT_TOKEN } from '../database/secret.js';
import { sendEmail, buildStyledEmail } from '../database/brevo.js';
import { sendSms } from '../database/smsSender.js';
import {
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  generateSecureOtp,
  checkRateLimit,
  inspectMalwareAndAttacks,
  extractClientIp,
} from '../security/shield.js';

const DEFAULT_JWT_SECRET = JWT_SECRET;
export const STUDENT_COOKIE_NAME = STUDENT_TOKEN;

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
  if (!password) throw new Error('Password is required for hashing.');
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

export async function setStudentSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };

  if (response && response.cookies) {
    response.cookies.set(STUDENT_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.set(STUDENT_COOKIE_NAME, token, cookieOptions);
    } catch {}
  }
}

export async function clearStudentSessionCookie(response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };

  if (response && response.cookies) {
    response.cookies.set(STUDENT_COOKIE_NAME, '', cookieOptions);
    response.cookies.delete?.(STUDENT_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.delete(STUDENT_COOKIE_NAME);
    } catch {}
  }
}

export async function createStudentLoginSession(studentId, websiteId, token, request) {
  try {
    const ip = extractClientIp(request);
    const ua = request?.headers?.get?.('user-agent') || 'Unknown';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await queryDb(
      `INSERT INTO website_student_login_sessions (student_id, website_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [studentId, websiteId, token, ip, ua, expiresAt]
    );
  } catch (err) {
  }
}

export async function revokeStudentLoginSession(token) {
  try {
    if (!token) return;
    await queryDb(
      `UPDATE website_student_login_sessions SET is_revoked = TRUE WHERE token = $1`,
      [token]
    );
  } catch (err) {
  }
}

export async function revokeAllStudentSessions(websiteId, studentId) {
  try {
    await queryDb(
      `UPDATE website_student_login_sessions
       SET is_revoked = TRUE
       WHERE website_id = $1 AND student_id = $2`,
      [websiteId, studentId]
    );
  } catch (err) {
  }
}

export async function authenticateStudent({
  identifier,
  password,
  websiteId,
  channel = 'email',
  twoFactorCode = null,
  request = null,
  website = null,
}) {
  const cleanId = String(identifier || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanId || !cleanPassword) {
    throw new Error('Registration number, email, or phone number and password are required.');
  }

  if (!websiteId) {
    throw new Error('Website ID context is required for authentication.');
  }

  const ip = extractClientIp(request);
  const userAgent = request?.headers?.get?.('user-agent') || 'Unknown';

  const rateCheck = checkRateLimit(`student_auth:${ip}:${websiteId}`, {
    windowMs: 60 * 1000,
    max: 15,
  });
  if (rateCheck.limited) {
    const err = new Error('Too many login attempts. Please wait a moment.');
    err.status = 429;
    throw err;
  }

  const lockoutCheck = await checkAccountLockout({
    table: 'website_students',
    identifier: cleanId,
    websiteId,
  });
  if (lockoutCheck.isLocked) {
    const err = new Error(lockoutCheck.error);
    err.status = 429;
    err.locked = true;
    err.remainingSeconds = lockoutCheck.remainingSeconds;
    err.remainingMinutes = lockoutCheck.remainingMinutes;
    throw err;
  }

  const cleanLower = cleanId.toLowerCase();
  const raw = cleanId;
  const digits = raw.replace(/\D/g, '');

  let res = await queryDb(
    `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
            s.class_id, s.section_id, s.session_id, s.is_active, s.password,
            COALESCE(s.phone, s.number) AS phone, s.number,
            COALESCE(s.is_verified, FALSE) AS is_verified,
            COALESCE(i.is_registered, s.is_registered, TRUE) AS is_registered,
            COALESCE(i.verification_status, s.verification_status, 'verified') AS verification_status,
            COALESCE(s.name, i.data->>'name', 'Student') AS name,
            COALESCE(s.email, i.data->>'email') AS email,
            s.two_factor_code, s.two_factor_expires,
            c.name AS class_name,
            sec.name AS section_name,
            ses.name AS session_name
     FROM website_students s
     LEFT JOIN website_student_info i ON s.id = i.student_id
     LEFT JOIN website_classes c ON s.class_id = c.id
     LEFT JOIN website_sections sec ON s.section_id = sec.id
     LEFT JOIN website_sessions ses ON s.session_id = ses.id
     WHERE s.website_id = $1 AND (
       LOWER(s.registration_no) = $2
       OR LOWER(COALESCE(s.email, i.data->>'email')) = $2
       OR LOWER(s.student_unique_id) = $2
       OR s.number = $3
       OR s.phone = $3
       OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(s.phone, s.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
     )
     LIMIT 1`,
    [websiteId, cleanLower, raw, digits]
  );

  if (res.rows.length === 0) {
    throw new Error('Invalid registration credentials. Please check your details.');
  }

  const student = res.rows[0];

  const passwordMatch = await comparePassword(cleanPassword, student.password);
  if (!passwordMatch) {
    const failInfo = await recordFailedLogin({
      table: 'website_students',
      id: student.id,
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
      : 'Invalid registration credentials or password.';
    throw new Error(message);
  }

  if (!student.is_registered || student.verification_status === 'pending_setup') {
    const err = new Error('Your account setup is incomplete. Please complete your registration profile first.');
    err.verification_status = 'pending_setup';
    err.status = 403;
    throw err;
  }

  if (student.verification_status === 'submitted' || !student.is_verified) {
    const err = new Error('Your enrollment profile has been submitted and is currently pending institutional administration review.');
    err.verification_status = 'submitted';
    err.status = 403;
    throw err;
  }

  if (student.verification_status === 'rejected') {
    const err = new Error('Your enrollment profile was reviewed and rejected by campus administration. Please contact registrar support.');
    err.verification_status = 'rejected';
    err.status = 403;
    throw err;
  }

  if (!student.is_active) {
    try {
      await queryDb(
        `INSERT INTO website_student_login_activities (website_id, student_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, $4, 'Failed', 'Account deactivated')`,
        [websiteId, student.id, ip, userAgent]
      );
    } catch (_) {}
    const err = new Error('Your student account is currently deactivated. Please contact the campus administration.');
    err.status = 403;
    throw err;
  }

  await recordSuccessfulLogin({
    table: 'website_students',
    id: student.id,
    websiteId,
    ip,
    userAgent,
  });

  const token = generateToken({
    id: student.id,
    email: student.email,
    registration_no: student.registration_no,
    websiteId,
    name: student.name,
  });

  await createStudentLoginSession(student.id, websiteId, token, request);

  const studentData = {
    id: student.id,
    websiteId: student.website_id,
    website_id: student.website_id,
    name: student.name,
    email: student.email,
    registrationNumber: student.registration_no,
    registration_no: student.registration_no,
    roll_no: student.roll_no,
    student_unique_id: student.student_unique_id,
    phone: student.phone || student.number,
    number: student.phone || student.number,
    class_id: student.class_id,
    section_id: student.section_id,
    session_id: student.session_id,
    class_name: student.class_name,
    section_name: student.section_name,
    session_name: student.session_name,
    isActive: Boolean(student.is_active),
    isRegistered: Boolean(student.is_registered),
    isVerified: Boolean(student.is_verified),
    verification_status: student.verification_status,
  };

  return {
    student: studentData,
    token,
  };
}

export async function getStudentSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(STUDENT_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const sessRes = await queryDb(
      `SELECT id, is_revoked, expires_at 
       FROM website_student_login_sessions 
       WHERE token = $1 LIMIT 1`,
      [token]
    );
    if (sessRes.rows.length > 0) {
      const sess = sessRes.rows[0];
      if (sess.is_revoked) return null;
      if (sess.expires_at && new Date(sess.expires_at) < new Date()) return null;
    }

    let res = await queryDb(
      `SELECT s.id, s.website_id,
              COALESCE(s.registration_no, s.student_unique_id, i.data->>'registration_no', i.data->>'registration_number') AS registration_no,
              s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              COALESCE(s.phone, s.number) AS phone, s.number,
              COALESCE(s.name, i.data->>'name', 'Student') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, CASE WHEN i.data->>'date_of_birth' ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (i.data->>'date_of_birth')::date ELSE NULL END) AS date_of_birth,
              COALESCE(s.religion, i.data->>'religion') AS religion,
              COALESCE(s.admission_date, CASE WHEN i.data->>'admission_date' ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (i.data->>'admission_date')::date ELSE NULL END) AS admission_date,
              COALESCE(i.is_registered, s.is_registered, FALSE) AS is_registered,
              COALESCE(s.is_verified, FALSE) AS is_verified,
              COALESCE(i.verification_status, s.verification_status, 'pending_setup') AS verification_status,
              COALESCE(c.name, i.data->>'class_name', 'General Enrollment') AS class_name,
              sec.name AS section_name, ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (res.rows.length === 0) return null;
    const student = res.rows[0];

    if (!student.is_active || !student.is_registered || !student.is_verified) return null;

    const studentData = {
      id: student.id,
      websiteId: student.website_id,
      website_id: student.website_id,
      name: student.name,
      email: student.email,
      registrationNumber: student.registration_no,
      registration_no: student.registration_no,
      roll_no: student.roll_no,
      student_unique_id: student.student_unique_id,
      phone: student.phone || student.number,
      number: student.phone || student.number,
      class_id: student.class_id,
      section_id: student.section_id,
      session_id: student.session_id,
      class_name: student.class_name,
      section_name: student.section_name,
      session_name: student.session_name,
      isActive: Boolean(student.is_active),
      isRegistered: Boolean(student.is_registered),
      isVerified: Boolean(student.is_verified),
      verification_status: student.verification_status,
      token,
    };

    return {
      student: studentData,
      user: studentData,
      id: student.id,
      email: student.email,
      name: student.name,
      registrationNumber: student.registration_no,
      registration_no: student.registration_no,
      website_id: student.website_id,
      websiteId: student.website_id,
      isActive: Boolean(student.is_active),
      isRegistered: Boolean(student.is_registered),
      isVerified: Boolean(student.is_verified),
      token,
    };
  } catch (error) {
    return null;
  }
}

export const getStudentUser = async (request) => {
  const session = await getStudentSession(request);
  return session?.student || null;
};

export async function isStudent(request) {
  try {
    const session = await getStudentSession(request);
    return Boolean(session && session.isActive && session.isRegistered && session.isVerified);
  } catch {
    return false;
  }
}

export async function requireStudent(request) {
  const session = await getStudentSession(request);
  if (!session || !session.isActive || !session.isVerified) {
    return { error: 'Unauthorized: Verified student authentication required.', status: 401 };
  }
  return { student: session.student, session };
}

const StudentMiddleware = {
  STUDENT_COOKIE_NAME,
  authenticateStudent,
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setStudentSessionCookie,
  clearStudentSessionCookie,
  getStudentSession,
  getStudentUser,
  isStudent,
  requireStudent,
  createStudentLoginSession,
  revokeStudentLoginSession,
  revokeAllStudentSessions,
};

export default StudentMiddleware;

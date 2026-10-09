import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryDb } from '../database/db.js';
import { JWT_SECRET, TEACHER_TOKEN } from '../database/secret.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';
export const TEACHER_COOKIE_NAME = TEACHER_TOKEN || 'hiesci-teacher';

// ============================================================================
// Cookie helper
// ============================================================================
async function getCookieStore() {
  try {
    const nextHeaders = await import('next/headers');
    if (nextHeaders && typeof nextHeaders.cookies === 'function') {
      return await nextHeaders.cookies();
    }
  } catch {
    // Outside Next.js server runtime context
  }
  return null;
}

// ============================================================================
// Password helpers
// ============================================================================
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

// ============================================================================
// JWT helpers
// ============================================================================
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

// ============================================================================
// Session Cookie helpers
// ============================================================================
export async function setTeacherSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  if (response && response.cookies) {
    response.cookies.set(TEACHER_COOKIE_NAME, token, cookieOptions);
    response.cookies.set('fit-teacher', token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.set(TEACHER_COOKIE_NAME, token, cookieOptions);
      cookieStore?.set('fit-teacher', token, cookieOptions);
    } catch {}
  }
}

export async function clearTeacherSessionCookie(response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };

  if (response && response.cookies) {
    response.cookies.set(TEACHER_COOKIE_NAME, '', cookieOptions);
    response.cookies.delete?.(TEACHER_COOKIE_NAME);
    response.cookies.delete?.('fit-teacher');
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.delete(TEACHER_COOKIE_NAME);
      cookieStore?.delete('fit-teacher');
    } catch {}
  }
}

// ============================================================================
// Teacher Session & RBAC Helpers
// ============================================================================

/**
 * Creates an active teacher session record in website_teacher_login_sessions
 */
export async function createTeacherSession({ websiteId, teacherId, token, request, expiresAt }) {
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
      `INSERT INTO website_teacher_login_sessions (website_id, teacher_id, token, ip_address, user_agent, expires_at, is_revoked)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING id`,
      [websiteId, teacherId, token, ip, userAgent, exp]
    );

    return res.rows[0]?.id || null;
  } catch (error) {
    console.error('Error creating teacher session:', error);
    return null;
  }
}

/**
 * Revokes all sessions for a teacher
 */
export async function revokeAllTeacherSessions(websiteId, teacherId) {
  try {
    await queryDb(
      `UPDATE website_teacher_login_sessions
       SET is_revoked = TRUE
       WHERE website_id = $1 AND teacher_id = $2`,
      [websiteId, teacherId]
    );
  } catch (error) {
    console.error('Error revoking teacher sessions:', error);
  }
}

/**
 * Extracts and returns the authenticated teacher session from request or cookies
 */
export async function getTeacherSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(TEACHER_COOKIE_NAME)?.value || request.cookies.get('fit-teacher')?.value;
      }
    }

    if (!token) {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        token = cookieStore.get(TEACHER_COOKIE_NAME)?.value || cookieStore.get('fit-teacher')?.value;
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    // Check website_teachers first
    const res = await queryDb(
      `SELECT wt.id, wt.website_id, wt.designation_id, wt.name, wt.email, wt.number,
              wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion,
              wt.address, wt.permanent_address, wt.joining_date, wt.salary, wt.photo_url,
              wt.photo_id, wt.is_active, wt.is_registered, wt.created_at,
              wd.title AS designation_title,
              w.name AS website_name, w.subdomain AS website_subdomain, w.custom_domain AS website_custom_domain
       FROM website_teachers wt
       LEFT JOIN website_designations wd ON wd.id = wt.designation_id
       LEFT JOIN websites w ON w.id = wt.website_id
       WHERE wt.id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (res.rows.length === 0) return null;
    const teacher = res.rows[0];

    if (!teacher.is_active || !teacher.is_registered) return null;

    // Check if session token was revoked
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
      number: teacher.number,
      address: teacher.address,
      permanentAddress: teacher.permanent_address,
      emergencyContact: teacher.emergency_contact,
      designation: teacher.designation_title || 'Teacher',
      designationId: teacher.designation_id,
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
  } catch (error) {
    console.error('Error fetching teacher session:', error);
    return null;
  }
}

export const getTeacherUser = async (request) => {
  const session = await getTeacherSession(request);
  return session?.teacher || null;
};

/**
 * Checks whether the current request is an authenticated and active teacher
 */
export async function isTeacher(request) {
  try {
    const session = await getTeacherSession(request);
    return Boolean(session && session.isActive && session.isRegistered);
  } catch {
    return false;
  }
}

/**
 * Route guard requiring teacher authentication
 */
export async function requireTeacher(request) {
  const session = await getTeacherSession(request);
  if (!session || !session.isActive) {
    return { error: 'Unauthorized: Teacher authentication required.', status: 401 };
  }
  return { teacher: session.teacher, session };
}

const TeacherMiddleware = {
  TEACHER_COOKIE_NAME,
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

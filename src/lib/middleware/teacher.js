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

    // Check teachers table first, then website_teachers if exists
    let res = await query(
      `SELECT id, name, email, number, is_active, is_registered, website_id, created_at
       FROM teachers
       WHERE id = $1 LIMIT 1`,
      [decoded.id]
    ).catch(() => ({ rows: [] }));

    if (res.rows.length === 0) {
      res = await query(
        `SELECT id, name, email, number, is_active, is_registered, website_id, created_at
         FROM website_teachers
         WHERE id = $1 LIMIT 1`,
        [decoded.id]
      ).catch(() => ({ rows: [] }));
    }

    if (res.rows.length === 0) return null;
    const teacher = res.rows[0];

    if (!teacher.is_active || !teacher.is_registered) return null;

    return {
      teacher,
      user: teacher,
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      website_id: teacher.website_id,
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
  getTeacherSession,
  getTeacherUser,
  isTeacher,
  requireTeacher,
};

export default TeacherMiddleware;

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryDb } from '../database/db.js';
import { JWT_SECRET, STUDENT_TOKEN } from '../database/secret.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';
export const STUDENT_COOKIE_NAME = STUDENT_TOKEN || 'hiesci-student';

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
export async function setStudentSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  if (response && response.cookies) {
    response.cookies.set(STUDENT_COOKIE_NAME, token, cookieOptions);
    response.cookies.set('fit-student', token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.set(STUDENT_COOKIE_NAME, token, cookieOptions);
      cookieStore?.set('fit-student', token, cookieOptions);
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
    response.cookies.delete?.('fit-student');
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.delete(STUDENT_COOKIE_NAME);
      cookieStore?.delete('fit-student');
    } catch {}
  }
}

// ============================================================================
// Student Session & RBAC Helpers
// ============================================================================

/**
 * Extracts and returns the authenticated student session from request or cookies
 */
export async function getStudentSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(STUDENT_COOKIE_NAME)?.value || request.cookies.get('fit-student')?.value;
      }
    }

    if (!token) {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        token = cookieStore.get(STUDENT_COOKIE_NAME)?.value || cookieStore.get('fit-student')?.value;
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    // Check students table first, then website_students
    let res = await query(
      `SELECT id, name, email, registration_number, is_active, is_registered, website_id, created_at
       FROM students
       WHERE id = $1 LIMIT 1`,
      [decoded.id]
    ).catch(() => ({ rows: [] }));

    if (res.rows.length === 0) {
      res = await query(
        `SELECT id, name, email, registration_number, is_active, is_registered, website_id, created_at
         FROM website_students
         WHERE id = $1 LIMIT 1`,
        [decoded.id]
      ).catch(() => ({ rows: [] }));
    }

    if (res.rows.length === 0) return null;
    const student = res.rows[0];

    if (!student.is_active || !student.is_registered) return null;

    return {
      student,
      user: student,
      id: student.id,
      email: student.email,
      name: student.name,
      registrationNumber: student.registration_number,
      website_id: student.website_id,
      isActive: Boolean(student.is_active),
      isRegistered: Boolean(student.is_registered),
      token,
    };
  } catch (error) {
    console.error('Error fetching student session:', error);
    return null;
  }
}

export const getStudentUser = async (request) => {
  const session = await getStudentSession(request);
  return session?.student || null;
};

/**
 * Checks whether the current request is an authenticated and active student
 */
export async function isStudent(request) {
  try {
    const session = await getStudentSession(request);
    return Boolean(session && session.isActive && session.isRegistered);
  } catch {
    return false;
  }
}

/**
 * Route guard requiring student authentication
 */
export async function requireStudent(request) {
  const session = await getStudentSession(request);
  if (!session || !session.isActive) {
    return { error: 'Unauthorized: Student authentication required.', status: 401 };
  }
  return { student: session.student, session };
}

const StudentMiddleware = {
  STUDENT_COOKIE_NAME,
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
};

export default StudentMiddleware;

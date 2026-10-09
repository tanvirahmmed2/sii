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

    // Check website_students joined with website_student_info
    let res = await query(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              COALESCE(i.name, s.name) AS name,
              COALESCE(i.email, s.email) AS email,
              COALESCE(i.number, s.number) AS number,
              COALESCE(i.gender, s.gender) AS gender,
              COALESCE(i.blood_group, s.blood_group) AS blood_group,
              COALESCE(i.date_of_birth, s.date_of_birth) AS date_of_birth,
              COALESCE(i.religion, s.religion) AS religion,
              COALESCE(i.admission_date, s.admission_date) AS admission_date,
              COALESCE(i.is_registered, s.is_registered, FALSE) AS is_registered,
              COALESCE(i.is_verified, s.is_verified, FALSE) AS is_verified,
              COALESCE(i.verification_status, s.verification_status, 'pending_setup') AS verification_status,
              c.name AS class_name, sec.name AS section_name, ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.id = $1 LIMIT 1`,
      [decoded.id]
    ).catch(() => ({ rows: [] }));

    if (res.rows.length === 0) {
      // Fallback for legacy table
      res = await query(
        `SELECT id, name, email, registration_number, is_active, is_registered,
                TRUE AS is_verified, 'verified' AS verification_status, website_id, created_at
         FROM students
         WHERE id = $1 LIMIT 1`,
        [decoded.id]
      ).catch(() => ({ rows: [] }));
    }

    if (res.rows.length === 0) return null;
    const student = res.rows[0];

    if (!student.is_active || !student.is_registered || !student.is_verified) return null;

    return {
      student,
      user: student,
      id: student.id,
      email: student.email,
      name: student.name,
      registrationNumber: student.registration_no || student.registration_number,
      registration_no: student.registration_no || student.registration_number,
      roll_no: student.roll_no,
      student_unique_id: student.student_unique_id,
      class_id: student.class_id,
      section_id: student.section_id,
      session_id: student.session_id,
      class_name: student.class_name,
      section_name: student.section_name,
      session_name: student.session_name,
      website_id: student.website_id,
      isActive: Boolean(student.is_active),
      isRegistered: Boolean(student.is_registered),
      isVerified: Boolean(student.is_verified),
      verification_status: student.verification_status,
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
 * Checks whether the current request is an authenticated, active, and verified student
 */
export async function isStudent(request) {
  try {
    const session = await getStudentSession(request);
    return Boolean(session && session.isActive && session.isRegistered && session.isVerified);
  } catch {
    return false;
  }
}

/**
 * Route guard requiring student authentication
 */
export async function requireStudent(request) {
  const session = await getStudentSession(request);
  if (!session || !session.isActive || !session.isVerified) {
    return { error: 'Unauthorized: Verified student authentication required.', status: 401 };
  }
  return { student: session.student, session };
}

/**
 * Creates login session row in website_student_login_sessions
 */
export async function createStudentLoginSession(studentId, websiteId, token, request) {
  try {
    const ip = request?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const ua = request?.headers?.get?.('user-agent') || 'Unknown';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO website_student_login_sessions (student_id, website_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [studentId, websiteId, token, ip, ua, expiresAt]
    );
  } catch (err) {
    console.warn('Failed to record student login session:', err.message);
  }
}

/**
 * Revokes a student session in website_student_login_sessions
 */
export async function revokeStudentLoginSession(token) {
  try {
    if (!token) return;
    await query(
      `UPDATE website_student_login_sessions SET is_revoked = TRUE WHERE token = $1`,
      [token]
    );
  } catch (err) {
    console.warn('Failed to revoke student login session:', err.message);
  }
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
  createStudentLoginSession,
  revokeStudentLoginSession,
};

export default StudentMiddleware;

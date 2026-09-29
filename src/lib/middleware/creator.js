import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '../database/secret.js';
import { query, queryDb } from '../database/db.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'creator_studio_jwt_secret_key_2026';
const CREATOR_COOKIE_NAME = 'creator_session_token';

// Password helpers
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

// JWT helpers
export function signJWT(payload, expiresIn = '7d') {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn });
}

export function generateToken(payload, expiresIn = '7d') {
  return signJWT(payload, expiresIn);
}

export function verifyJWT(token) {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Cookie helpers
export async function setCreatorSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  if (response && response.cookies) {
    response.cookies.set(CREATOR_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await cookies();
      cookieStore.set(CREATOR_COOKIE_NAME, token, cookieOptions);
    } catch (e) {}
  }
}

export async function clearCreatorSessionCookie(response) {
  if (response && response.cookies) {
    response.cookies.delete(CREATOR_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(CREATOR_COOKIE_NAME);
    } catch (e) {}
  }
}

/**
 * Extracts and decodes active creator session from request or cookies
 */
export async function getCreatorSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(CREATOR_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(CREATOR_COOKIE_NAME)?.value;
      } catch (e) {}
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    const res = await query(
      `SELECT id, name, email, phone, bio, avatar_url, is_active, is_verified, created_at
       FROM creators
       WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (res.rows.length === 0) return null;
    const c = res.rows[0];

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      bio: c.bio,
      avatarUrl: c.avatar_url,
      isActive: c.is_active,
      isVerified: c.is_verified,
      createdAt: c.created_at,
    };
  } catch (error) {
    console.error('Error getting creator session:', error);
    return null;
  }
}

/**
 * Direct email/password authentication handler for creators
 */
export async function authenticateCreator(email, password, { ip = '127.0.0.1', userAgent = 'Unknown', twoFactorCode } = {}) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  const res = await queryDb(
    `SELECT * FROM creators WHERE LOWER(email) = $1 LIMIT 1`,
    [cleanEmail]
  );

  if (res.rows.length === 0) {
    throw new Error('No creator account found with this email.');
  }

  const creator = res.rows[0];

  if (!creator.is_active) {
    const err = new Error('Your creator account has been deactivated.');
    err.deactivated = true;
    err.status = 403;
    throw err;
  }

  const isMatch = await comparePassword(password, creator.password);
  if (!isMatch) {
    throw new Error('Incorrect email or password.');
  }

  if (!creator.is_verified) {
    const err = new Error('Please verify your email address to access your creator studio.');
    err.unverified = true;
    err.email = creator.email;
    err.status = 403;
    throw err;
  }

  const token = generateToken({
    id: creator.id,
    email: creator.email,
    role: 'creator',
    type: 'creator',
  });

  // Record session in creator_login_sessions
  try {
    await queryDb(
      `INSERT INTO creator_login_sessions (creator_id, session_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [creator.id, token, ip, userAgent]
    );
  } catch (e) {
    console.warn('Notice saving creator session:', e.message);
  }

  // Set cookie
  await setCreatorSessionCookie(null, token);

  return {
    creator: {
      id: creator.id,
      name: creator.name,
      email: creator.email,
      phone: creator.phone,
      bio: creator.bio,
      isVerified: creator.is_verified,
    },
    token,
  };
}

export default {
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setCreatorSessionCookie,
  clearCreatorSessionCookie,
  getCreatorSession,
  authenticateCreator,
};

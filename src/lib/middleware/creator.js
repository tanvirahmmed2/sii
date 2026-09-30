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
      `SELECT *
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
      institution: c.institution || null,
      bio: c.bio || null,
      avatarUrl: c.avatar_url || null,
      isActive: c.is_active,
      isVerified: c.is_verified || c.email_verified || false,
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

  const isVerified = Boolean(creator.email_verified || creator.is_verified);
  if (!isVerified) {
    const err = new Error('Please verify your email address to access your creator studio.');
    err.unverified = true;
    err.email = creator.email;
    err.status = 403;
    throw err;
  }

  // Handle 2FA if active code is present
  if (creator.two_factor_code && creator.two_factor_expires && new Date(creator.two_factor_expires) > new Date()) {
    if (!twoFactorCode) {
      const err = new Error('Two-factor authentication code required.');
      err.twoFactorRequired = true;
      err.status = 401;
      throw err;
    }
    if (String(twoFactorCode).trim() !== String(creator.two_factor_code).trim()) {
      const err = new Error('Invalid two-factor authentication code.');
      err.twoFactorRequired = true;
      err.twoFactorInvalid = true;
      err.status = 401;
      throw err;
    }
  }

  const token = generateToken({
    id: creator.id,
    email: creator.email,
    role: 'creator',
    type: 'creator',
  });

  // Update last_login_at
  try {
    await queryDb(
      `UPDATE creators SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [creator.id]
    );
  } catch (e) {
    // Non-blocking
  }

  // Set cookie
  await setCreatorSessionCookie(null, token);

  return {
    creator: {
      id: creator.id,
      name: creator.name,
      email: creator.email,
      phone: creator.phone,
      institution: creator.institution,
      isVerified: true,
      emailVerified: true,
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

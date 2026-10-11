import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, DEVELOPER_TOKEN } from '../database/secret.js';
import { query, queryDb } from '../database/db.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_jwt_secret_key_2026';
export const DEVELOPER_COOKIE_NAME = DEVELOPER_TOKEN;
export const ADMIN_COOKIE_NAME = DEVELOPER_TOKEN; // Compatibility alias

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
// Password Helpers (Bcrypt)
// ============================================================================
export async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required for hashing.');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(String(password), String(hash));
  } catch (err) {
    console.warn('Password comparison notice:', err.message);
    return false;
  }
}

// ============================================================================
// JWT Helpers
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
// Cookie Helpers
// ============================================================================
export async function setDeveloperSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  if (response && response.cookies) {
    response.cookies.set(DEVELOPER_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        cookieStore.set(DEVELOPER_COOKIE_NAME, token, cookieOptions);
      }
    } catch {
      // Non-server-action context
    }
  }
}

export async function clearDeveloperSessionCookie(response) {
  if (response && response.cookies) {
    response.cookies.delete(DEVELOPER_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        cookieStore.delete(DEVELOPER_COOKIE_NAME);
      }
    } catch {
      // Ignore
    }
  }
}

// Compatibility aliases
export const setAdminSessionCookie = setDeveloperSessionCookie;
export const clearAdminSessionCookie = clearDeveloperSessionCookie;

// ============================================================================
// Developer Session Management (Direct Developers & Module Permissions)
// Adheres strictly to psql/schema.psql (developers, developer_login_sessions, module_permissions)
// ============================================================================

/**
 * Extracts and decodes developer session from request or cookies.
 * Contains NO roles; permissions are mapped directly from module_permissions.
 */
export async function getDeveloperSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(DEVELOPER_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      try {
        const cookieStore = await getCookieStore();
        if (cookieStore) {
          token = cookieStore.get(DEVELOPER_COOKIE_NAME)?.value;
        }
      } catch {
        // Not in server request context
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    // Verify against database developers table
    const res = await query(
      `SELECT d.id, d.name, d.email, d.phone, d.designation, d.avatar_url, d.bio,
              d.github_profile, d.linkedin_profile, d.is_active, d.email_verified
       FROM developers d
       WHERE d.id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (res.rows.length === 0) return null;
    const dev = res.rows[0];

    if (!dev.is_active) return null;

    // Check developer_login_sessions for revocation and activity
    try {
      const sessRes = await query(
        `SELECT is_active, expires_at FROM developer_login_sessions WHERE token = $1 AND developer_id = $2 LIMIT 1`,
        [token, dev.id]
      );

      if (sessRes.rows.length === 0) {
        // Auto-heal session in database for valid, active JWT
        await query(
          `INSERT INTO developer_login_sessions (developer_id, token, ip_address, user_agent, expires_at, is_active)
           VALUES ($1, $2, '127.0.0.1', 'Active Session', CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE)
           ON CONFLICT (token) DO UPDATE SET is_active = TRUE, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days', last_active_at = CURRENT_TIMESTAMP`,
          [dev.id, token]
        ).catch(() => {});
      } else {
        const s = sessRes.rows[0];
        if (s.is_active === false) return null;
        if (s.expires_at && new Date(s.expires_at) < new Date()) return null;

        // Touch last_active_at asynchronously
        query(
          `UPDATE developer_login_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE token = $1`,
          [token]
        ).catch(() => {});
      }
    } catch (e) {
      console.warn('Notice verifying developer session against database:', e.message);
    }

    // Fetch granular permissions directly from module_permissions (combines developer with module)
    const permRes = await queryDb(
      `SELECT m.slug AS module_slug, mp.can_view, mp.can_create, mp.can_edit, mp.can_delete
       FROM module_permissions mp
       JOIN modules m ON mp.module_id = m.id
       WHERE mp.developer_id = $1 AND m.is_active = TRUE`,
      [dev.id]
    ).catch(() => ({ rows: [] }));

    let permissions = permRes.rows
      .filter((r) => r.can_view)
      .map((r) => r.module_slug);

    // Platform root developer / owner fallback
    const isOwner = Number(dev.id) === 1 || String(dev.email).toLowerCase() === 'tanvir004006@gmail.com';
    if (permissions.length === 0 || isOwner) {
      const allMods = await queryDb(`SELECT slug FROM modules WHERE is_active = TRUE`).catch(() => ({ rows: [] }));
      permissions = Array.from(new Set([...permissions, ...allMods.rows.map((r) => r.slug)]));
    }

    const permissionsMap = {};
    for (const r of permRes.rows) {
      permissionsMap[r.module_slug] = {
        can_view: Boolean(r.can_view),
        can_create: Boolean(r.can_create),
        can_edit: Boolean(r.can_edit),
        can_delete: Boolean(r.can_delete),
      };
    }

    return {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      phone: dev.phone,
      designation: dev.designation,
      avatarUrl: dev.avatar_url,
      bio: dev.bio,
      githubProfile: dev.github_profile,
      linkedinProfile: dev.linkedin_profile,
      isActive: dev.is_active,
      isVerified: Boolean(dev.email_verified),
      permissions,
      permissionsMap,
      token,
    };
  } catch (error) {
    console.error('Error fetching developer session:', error);
    return null;
  }
}

// Compatibility aliases
export const getAdminSession = getDeveloperSession;
export const getAuthenticatedUser = getDeveloperSession;

/**
 * Checks whether the request is from an active developer session.
 */
export async function isDeveloper(request) {
  try {
    const session = await getDeveloperSession(request);
    return Boolean(session && session.isActive);
  } catch {
    return false;
  }
}

export const getDeveloperUser = getDeveloperSession;

export async function isStaff(request) {
  const session = await getDeveloperSession(request);
  if (!session || !session.isActive) {
    return { success: false, user: null, staff: null };
  }
  return { success: true, user: session, staff: session };
}
export const authenticateStaff = isStaff;

// ============================================================================
// Direct Module Permissions Validation (No Roles)
// Combines Developer directly with Module per schema.psql
// ============================================================================

/**
 * Checks if current developer has permission for a specific module or action.
 */
export async function hasModulePermission(request, moduleSlug) {
  try {
    const session = await getDeveloperSession(request);
    if (!session || !session.isActive) {
      return { success: false, user: null, staff: null, developer: null, message: 'Unauthenticated' };
    }

    // Default global developer pages
    if (!moduleSlug || moduleSlug === 'overview' || moduleSlug === 'profile' || moduleSlug === 'settings') {
      return { success: true, user: session, staff: session, developer: session };
    }

    // Platform owner check
    const isOwner = Number(session.id) === 1 || String(session.email).toLowerCase() === 'tanvir004006@gmail.com';
    if (isOwner) {
      return { success: true, user: session, staff: session, developer: session };
    }

    // Normalize module slugs into an array of lowercase strings
    const slugs = (Array.isArray(moduleSlug) ? moduleSlug : [moduleSlug])
      .map((s) => String(s || '').toLowerCase().trim())
      .filter(Boolean);

    if (slugs.length === 0) {
      return { success: true, user: session, staff: session, developer: session };
    }

    // Direct developer module_permissions lookup (combines developer with modules)
    const permRes = await queryDb(
      `SELECT 1 FROM module_permissions mp
       JOIN modules m ON mp.module_id = m.id
       WHERE mp.developer_id = $1 AND mp.can_view = TRUE AND LOWER(m.slug) = ANY($2::text[])
       LIMIT 1`,
      [session.id, slugs]
    ).catch(() => ({ rows: [] }));

    if (permRes.rows.length > 0) {
      return { success: true, user: session, staff: session, developer: session };
    }

    // Fallback: check session permissions array
    const userPerms = (session.permissions || []).map((p) => String(p).toLowerCase().trim());
    const hasPerm = slugs.some((slug) => userPerms.includes(slug));

    if (hasPerm) {
      return { success: true, user: session, staff: session, developer: session };
    }

    return { success: false, user: session, staff: session, developer: session, message: 'Permission denied for this module' };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { success: false, user: null, staff: null, developer: null, message: error.message };
  }
}

export const hasDeveloperPermission = hasModulePermission;

export async function requireDeveloperPermission(request, moduleSlug) {
  const check = await hasModulePermission(request, moduleSlug);
  if (!check.success) {
    return {
      ...check,
      status: check.message === 'Unauthenticated' ? 401 : 403,
      error: check.message,
    };
  }
  return check;
}

// ============================================================================
// Direct Developer Authentication Handler
// Validates credentials against developers table and records activities & sessions
// ============================================================================

export async function authenticateDeveloper(email, password, { ip = '127.0.0.1', userAgent = 'Unknown' } = {}) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  const devRes = await queryDb(
    `SELECT d.*
     FROM developers d
     WHERE LOWER(d.email) = $1 LIMIT 1`,
    [cleanEmail]
  );

  if (devRes.rows.length === 0) {
    throw new Error('Invalid email or password.');
  }

  const dev = devRes.rows[0];

  if (!dev.is_active) {
    try {
      await queryDb(
        `INSERT INTO developer_login_activities (developer_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, 'Failed', 'Account deactivated')`,
        [dev.id, ip, userAgent]
      );
    } catch {}
    const err = new Error('Your developer account has been deactivated.');
    err.deactivated = true;
    throw err;
  }

  const isMatch = await comparePassword(cleanPassword, dev.password);
  if (!isMatch) {
    try {
      await queryDb(
        `INSERT INTO developer_login_activities (developer_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, 'Failed', 'Incorrect password')`,
        [dev.id, ip, userAgent]
      );
    } catch {}
    throw new Error('Invalid email or password.');
  }

  // Check if account email is verified
  if (dev.email_verified === false) {
    const err = new Error('Your developer account has not been verified yet. Please check your email for the activation link.');
    err.unverified = true;
    err.email = dev.email;
    throw err;
  }

  // Clear stale verification token if any
  if (dev.verification_token) {
    queryDb(`UPDATE developers SET verification_token = NULL, verification_token_expires = NULL WHERE id = $1`, [dev.id]).catch(() => {});
  }

  // Generate unique session token
  const token = generateToken({
    id: dev.id,
    email: dev.email,
    designation: dev.designation,
  });

  // Log successful activity and session adhering to schema.psql
  try {
    await queryDb(
      `UPDATE developers SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [dev.id]
    );

    await queryDb(
      `INSERT INTO developer_login_activities (developer_id, ip_address, user_agent, status)
       VALUES ($1, $2, $3, 'Success')`,
      [dev.id, ip, userAgent]
    );

    await queryDb(
      `INSERT INTO developer_login_sessions (developer_id, token, ip_address, user_agent, expires_at, is_active)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE)
       ON CONFLICT (token) DO UPDATE SET is_active = TRUE, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days', last_active_at = CURRENT_TIMESTAMP`,
      [dev.id, token, ip, userAgent]
    );
  } catch (e) {
    console.warn('Notice saving login activity:', e.message);
  }

  const developerProfile = {
    id: dev.id,
    name: dev.name,
    email: dev.email,
    phone: dev.phone,
    designation: dev.designation,
    avatarUrl: dev.avatar_url,
  };

  return {
    developer: developerProfile,
    admin: developerProfile, // Compatibility alias
    token,
  };
}

// Compatibility alias
export const authenticateAdmin = authenticateDeveloper;

const DeveloperMiddleware = {
  // Password & Auth
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setDeveloperSessionCookie,
  clearDeveloperSessionCookie,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  authenticateDeveloper,
  authenticateAdmin,

  // Session & Permissions
  getDeveloperSession,
  getAdminSession,
  getAuthenticatedUser,
  getDeveloperUser,
  isDeveloper,
  isStaff,
  authenticateStaff,
  hasModulePermission,
  hasDeveloperPermission,
  requireDeveloperPermission,
};

export default DeveloperMiddleware;

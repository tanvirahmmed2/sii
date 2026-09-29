import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWT_SECRET, DEVELOPER_TOKEN } from '../database/secret.js';
import { query } from '../database/db.js';
const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';
const ADMIN_COOKIE_NAME = DEVELOPER_TOKEN || 'hiesci-dev';
const FALLBACK_COOKIE_NAME = 'dev_admin_token';
const LEGACY_COOKIE_NAME = 'fit-dev';

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
export async function setAdminSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  if (response && response.cookies) {
    response.cookies.set(ADMIN_COOKIE_NAME, token, cookieOptions);
    response.cookies.set(FALLBACK_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_COOKIE_NAME, token, cookieOptions);
      cookieStore.set(FALLBACK_COOKIE_NAME, token, cookieOptions);
    } catch (e) {
      // In non-server-action context, ignore
    }
  }
}

export async function clearAdminSessionCookie(response) {
  if (response && response.cookies) {
    response.cookies.delete(ADMIN_COOKIE_NAME);
    response.cookies.delete(FALLBACK_COOKIE_NAME);
    response.cookies.delete(LEGACY_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(ADMIN_COOKIE_NAME);
      cookieStore.delete(FALLBACK_COOKIE_NAME);
      cookieStore.delete(LEGACY_COOKIE_NAME);
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Extracts and decodes developer session from request or cookies
 */
export async function getAdminSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token =
          request.cookies.get(ADMIN_COOKIE_NAME)?.value ||
          request.cookies.get(FALLBACK_COOKIE_NAME)?.value ||
          request.cookies.get(LEGACY_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token =
          cookieStore.get(ADMIN_COOKIE_NAME)?.value ||
          cookieStore.get(FALLBACK_COOKIE_NAME)?.value ||
          cookieStore.get(LEGACY_COOKIE_NAME)?.value;
      } catch (e) {
        // Not in server request context
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    // Verify against database adhering to schema.psql developers & developer_roles
    const res = await query(
      `SELECT d.id, d.name, d.email, d.phone, d.designation, d.avatar_url, d.bio,
              d.github_profile, d.linkedin_profile, d.role_id, d.is_active,
              COALESCE(dr.slug, 'developer') as role, 
              COALESCE(dr.name, 'Developer') as role_name
       FROM developers d
       LEFT JOIN developer_roles dr ON d.role_id = dr.id
       WHERE d.id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (res.rows.length === 0) return null;
    const dev = res.rows[0];

    if (!dev.is_active) return null;

    // Fetch granular permissions from developer_role_permissions
    let permissions = [];
    if (dev.role_id) {
      const permRes = await queryDb(
        `SELECT DISTINCT dm.slug as module_slug, mp.permission_key
         FROM developer_role_permissions drp
         JOIN module_permissions mp ON drp.permission_id = mp.id
         JOIN developer_modules dm ON mp.module_id = dm.id
         WHERE drp.role_id = $1`,
        [dev.role_id]
      ).catch(() => ({ rows: [] }));

      permissions = permRes.rows
        .map((r) => r.module_slug || r.permission_key)
        .filter(Boolean);
    }

    // Standard fallback modules if not explicitly configured in role_permissions
    const standardModules = {
      admin: ['overview', 'developers', 'roles', 'team', 'creators', 'users', 'websites', 'blogs', 'themes', 'packages', 'features', 'modules', 'purchases', 'payments', 'subscriptions', 'payroll', 'my-salaries', 'live-chats', 'chats', 'contacts', 'support', 'projects', 'reports', 'reviews', 'spams', 'leads', 'subscribers', 'apps', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'careers', 'policies'],
      manager: ['overview', 'creators', 'users', 'websites', 'packages', 'features', 'purchases', 'payments', 'subscriptions', 'live-chats', 'chats', 'contacts', 'support', 'projects', 'my-salaries', 'reports', 'reviews', 'leads', 'subscribers', 'apps', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'careers', 'policies'],
      developer: ['overview', 'websites', 'themes', 'packages', 'features', 'apps', 'spams', 'reports', 'blogs', 'support', 'projects', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'],
      marketer: ['overview', 'blogs', 'themes', 'leads', 'packages', 'reviews', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'],
      support: ['overview', 'live-chats', 'chats', 'contacts', 'support', 'reports', 'reviews', 'users', 'creators', 'subscribers', 'profile', 'settings', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'],
    };

    const roleSlug = (dev.role || 'developer').toLowerCase();
    const defaults = standardModules[roleSlug] || standardModules.developer || [];
    const allPermissions = Array.from(new Set([...permissions, ...defaults]));

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
      roleId: dev.role_id,
      role: dev.role,
      roleName: dev.role_name,
      isActive: dev.is_active,
      isVerified: true,
      permissions: allPermissions,
      isAdmin: ['admin', 'superadmin', 'manager', 'developer'].includes(roleSlug),
    };
  } catch (error) {
    console.error('Error fetching admin session:', error);
    return null;
  }
}

export const getAuthenticatedUser = getAdminSession;

export async function isStaff(request) {
  const session = await getAdminSession(request);
  if (!session || !session.isActive) {
    return { success: false, user: null };
  }
  return { success: true, user: session };
}

export const authenticateStaff = isStaff;

/**
 * Checks if current developer has permission for a specific module or action
 */
export async function hasModulePermission(request, moduleSlug) {
  try {
    const session = await getAdminSession(request);
    if (!session || !session.isActive) {
      return { success: false, user: null, message: 'Unauthenticated' };
    }

    // Admins and Superadmins have all permissions
    const userRole = (session.role || '').toLowerCase();
    if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') {
      return { success: true, user: session };
    }

    if (!moduleSlug || moduleSlug === 'overview' || moduleSlug === 'profile') {
      return { success: true, user: session };
    }

    // Dynamic role-based permission lookup
    const permRes = await queryDb(
      `SELECT 1 FROM developer_role_permissions drp
       JOIN module_permissions mp ON drp.permission_id = mp.id
       JOIN developer_modules dm ON mp.module_id = dm.id
       WHERE drp.role_id = $1 AND (LOWER(dm.slug) = LOWER($2) OR LOWER(mp.permission_key) = LOWER($2))
       LIMIT 1`,
      [session.roleId, moduleSlug]
    );

    if (permRes.rows.length > 0) {
      return { success: true, user: session };
    }

    // Fallback: check session permissions array
    if (session.permissions?.includes(moduleSlug.toLowerCase())) {
      return { success: true, user: session };
    }

    return { success: false, user: session, message: 'Permission denied for this module' };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { success: false, user: null, message: error.message };
  }
}

/**
 * Direct email/password authentication handler for developers
 */
export async function authenticateAdmin(email, password, { ip = '127.0.0.1', userAgent = 'Unknown' } = {}) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  const devRes = await queryDb(
    `SELECT d.*, COALESCE(dr.slug, 'developer') as role, COALESCE(dr.name, 'Developer') as role_name
     FROM developers d
     LEFT JOIN developer_roles dr ON d.role_id = dr.id
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
    } catch (e) {}
    const err = new Error('Your administrator account has been deactivated.');
    err.deactivated = true;
    throw err;
  }

  const isMatch = await comparePassword(password, dev.password);
  if (!isMatch) {
    try {
      await queryDb(
        `INSERT INTO developer_login_activities (developer_id, ip_address, user_agent, status, failure_reason)
         VALUES ($1, $2, $3, 'Failed', 'Incorrect password')`,
        [dev.id, ip, userAgent]
      );
    } catch (e) {}
    throw new Error('Invalid email or password.');
  }

  // Check if 2FA code is actively pending
  if (dev.two_factor_code && dev.two_factor_expires && new Date(dev.two_factor_expires) > new Date()) {
    const err = new Error('Please enter your 6-digit verification code before logging in.');
    err.unverified = true;
    err.email = dev.email;
    throw err;
  }

  // Generate session token
  const token = generateToken({
    id: dev.id,
    email: dev.email,
    role: dev.role,
    roleId: dev.role_id,
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
      `INSERT INTO developer_login_sessions (developer_id, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [dev.id, token, ip, userAgent]
    );
  } catch (e) {
    console.warn('Notice saving login activity:', e.message);
  }

  // Set cookie
  await setAdminSessionCookie(null, token);

  return {
    admin: {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      phone: dev.phone,
      designation: dev.designation,
      avatarUrl: dev.avatar_url,
      role: dev.role,
      roleName: dev.role_name,
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
  setAdminSessionCookie,
  clearAdminSessionCookie,
  getAdminSession,
  getAuthenticatedUser,
  isStaff,
  authenticateStaff,
  hasModulePermission,
  authenticateAdmin,
};

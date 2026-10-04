import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWT_SECRET, DEVELOPER_TOKEN } from '../database/secret.js';
import { query, queryDb } from '../database/db.js';
const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';
const ADMIN_COOKIE_NAME = DEVELOPER_TOKEN;

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
  } else {
    try {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_COOKIE_NAME, token, cookieOptions);
    } catch (e) {
      // In non-server-action context, ignore
    }
  }
}

export async function clearAdminSessionCookie(response) {
  if (response && response.cookies) {
    response.cookies.delete(ADMIN_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(ADMIN_COOKIE_NAME);
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
        token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
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

    // Check developer_login_sessions for revocation and activity
    if (token) {
      try {
        const sessRes = await query(
          `SELECT is_active, expires_at FROM developer_login_sessions WHERE token = $1 LIMIT 1`,
          [token]
        );
        if (sessRes.rows.length > 0) {
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
        // Fallback if session table isn't accessible
      }
    }

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
      admin: ['overview', 'developers', 'roles', 'team', 'creators', 'users', 'websites', 'blogs', 'packages', 'features', 'modules', 'purchases', 'payments', 'subscriptions', 'payroll', 'my-salaries', 'live-chats', 'chats', 'contacts', 'support', 'projects', 'reports', 'reviews', 'spams', 'facebook-messages', 'instagram-messages', 'whatsapp-messages', 'leads', 'subscribers', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'policies'],
      manager: ['overview', 'creators', 'users', 'websites', 'packages', 'features', 'purchases', 'payments', 'subscriptions', 'live-chats', 'chats', 'contacts', 'support', 'projects', 'my-salaries', 'facebook-messages', 'instagram-messages', 'whatsapp-messages', 'reports', 'reviews', 'leads', 'subscribers', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'policies'],
      developer: ['overview', 'websites', 'packages', 'features', 'spams', 'reports', 'blogs', 'support', 'live-chats', 'contacts', 'reviews', 'projects', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'],
      marketer: ['overview', 'blogs', 'leads', 'packages', 'reviews', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'],
      support: ['overview', 'live-chats', 'chats', 'contacts', 'support', 'reports', 'facebook-messages', 'instagram-messages', 'whatsapp-messages', 'reviews', 'users', 'creators', 'subscribers', 'profile', 'settings', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'],
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
      token,
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
    return { success: false, user: null, staff: null };
  }
  return { success: true, user: session, staff: session };
}

export const authenticateStaff = isStaff;

/**
 * Checks if current developer has permission for a specific module or action
 */
export async function hasModulePermission(request, moduleSlug) {
  try {
    const session = await getAdminSession(request);
    if (!session || !session.isActive) {
      return { success: false, user: null, staff: null, message: 'Unauthenticated' };
    }

    // Admins and Superadmins have all permissions
    const userRole = (session.role || '').toLowerCase();
    if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') {
      return { success: true, user: session, staff: session };
    }

    if (!moduleSlug || moduleSlug === 'overview' || moduleSlug === 'profile') {
      return { success: true, user: session, staff: session };
    }

    // Normalize module slugs into an array of lowercase strings
    const slugs = (Array.isArray(moduleSlug) ? moduleSlug : [moduleSlug])
      .map((s) => String(s || '').toLowerCase().trim())
      .filter(Boolean);

    if (slugs.length === 0) {
      return { success: true, user: session, staff: session };
    }

    // Dynamic role-based permission lookup
    const permRes = await queryDb(
      `SELECT 1 FROM developer_role_permissions drp
       JOIN module_permissions mp ON drp.permission_id = mp.id
       JOIN developer_modules dm ON mp.module_id = dm.id
       WHERE drp.role_id = $1 AND (LOWER(dm.slug) = ANY($2::text[]) OR LOWER(mp.permission_key) = ANY($2::text[]))
       LIMIT 1`,
      [session.roleId, slugs]
    );

    if (permRes.rows.length > 0) {
      return { success: true, user: session, staff: session };
    }

    // Fallback: check session permissions array
    const userPerms = (session.permissions || []).map((p) => String(p).toLowerCase().trim());
    const hasPerm = slugs.some((slug) => userPerms.includes(slug));

    if (hasPerm) {
      return { success: true, user: session, staff: session };
    }

    return { success: false, user: session, staff: session, message: 'Permission denied for this module' };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { success: false, user: null, staff: null, message: error.message };
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

  // Check if account email is verified
  if (dev.email_verified === false || dev.verification_token) {
    const err = new Error('Your developer account has not been verified yet. Please check your email for the activation link.');
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

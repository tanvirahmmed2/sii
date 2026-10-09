import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, DEVELOPER_TOKEN } from '../database/secret.js';
import { query, queryDb } from '../database/db.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';
const ADMIN_COOKIE_NAME = DEVELOPER_TOKEN;

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
// Password helpers (Always using bcrypt)
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
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Cookie helpers
// ============================================================================
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

// ============================================================================
// Developer Roles Constants & Definitions
// ============================================================================
export const DEVELOPER_ROLES = {
  SUPER_ADMIN: 'admin',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  LEAD_DEVELOPER: 'developer',
  MANAGER: 'manager',
  MARKETER: 'marketer',
  SUPPORT: 'support',
};

export const DEVELOPER_ROLE_LABELS = {
  admin: 'Super Admin',
  developer: 'Lead Developer',
  manager: 'Operations Manager',
  marketer: 'Marketing Specialist',
  support: 'Support Specialist',
};

export const DEVELOPER_ROLE_PERMISSIONS = {
  admin: [
    'overview', 'developers', 'roles', 'team', 'creators', 'users', 'websites',
    'blogs', 'packages', 'features', 'modules', 'purchases', 'payments', 'subscriptions', 'payroll', 'my-salaries',
    'live-chats', 'chats', 'contacts', 'support', 'reports', 'reviews', 'spams',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'leads', 'subscribers', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'policies'
  ],
  manager: [
    'overview', 'creators', 'users', 'websites', 'packages', 'features',
    'purchases', 'payments', 'subscriptions', 'live-chats', 'chats', 'contacts', 'support', 'my-salaries',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'reports', 'reviews', 'leads', 'subscribers', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'policies'
  ],
  developer: [
    'overview', 'websites', 'packages', 'features',
    'spams', 'reports', 'blogs', 'support', 'live-chats', 'contacts', 'reviews', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'
  ],
  marketer: [
    'overview', 'blogs', 'leads',
    'packages', 'reviews', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'
  ],
  support: [
    'overview', 'live-chats', 'chats', 'contacts', 'support', 'reports',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'reviews', 'users', 'creators', 'subscribers', 'profile', 'settings', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'
  ],
};

export const ROLE_PERMISSIONS = DEVELOPER_ROLE_PERMISSIONS;

// ============================================================================
// Developer Session & RBAC
// ============================================================================

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
        const cookieStore = await getCookieStore();
        if (cookieStore) {
          token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
        }
      } catch (e) {
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

    // If superadmin (Tanvir) or empty, provide all platform modules
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
      role: 'developer',
      roleSlug: 'developer',
      roleName: 'Developer',
      isActive: dev.is_active,
      isVerified: Boolean(dev.email_verified),
      permissions,
      permissionsMap,
      isAdmin: true,
      isSuperAdmin: isOwner,
      isPlatformAdmin: true,
      token,
    };
  } catch (error) {
    console.error('Error fetching admin session:', error);
    return null;
  }
}

export const getAuthenticatedUser = getAdminSession;
export const getDeveloperSession = getAdminSession;

export async function isStaff(request) {
  const session = await getAdminSession(request);
  if (!session || !session.isActive) {
    return { success: false, user: null, staff: null };
  }
  return { success: true, user: session, staff: session };
}

export const authenticateStaff = isStaff;

// ============================================================================
// Developer Role Guard & Authorization Helpers
// ============================================================================

/**
 * Returns current developer role slug (e.g. 'admin', 'developer', 'manager', etc.)
 */
export async function getDeveloperRole(requestOrSession) {
  let session = requestOrSession;
  if (!session || (session.headers && typeof session.headers.get === 'function') || !session.id) {
    session = await getAdminSession(requestOrSession);
  }
  return session ? String(session.role || 'developer').toLowerCase() : null;
}

/**
 * Checks if current developer has one of the allowed roles
 */
export async function hasDeveloperRole(requestOrSession, allowedRoles = []) {
  let session = requestOrSession;
  if (!session || (session.headers && typeof session.headers.get === 'function') || !session.id) {
    session = await getAdminSession(requestOrSession);
  }
  if (!session || !session.isActive) return false;

  const currentRole = String(session.role || '').toLowerCase();
  if (currentRole === 'admin' || currentRole === 'superadmin') return true;

  const roles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
    .map((r) => String(r || '').toLowerCase().trim())
    .filter(Boolean);

  if (roles.length === 0) return true;
  return roles.includes(currentRole);
}

export const hasRole = hasDeveloperRole;

/**
 * Route guard helper that enforces developer roles
 */
export async function requireDeveloperRole(request, allowedRoles = []) {
  const session = await getAdminSession(request);
  if (!session || !session.isActive) {
    return {
      success: false,
      status: 401,
      user: null,
      staff: null,
      message: 'Unauthorized: Active developer session required',
      error: 'Unauthorized',
    };
  }

  const allowed = await hasDeveloperRole(session, allowedRoles);
  if (!allowed) {
    return {
      success: false,
      status: 403,
      user: session,
      staff: session,
      message: 'Forbidden: Insufficient role permissions for this resource',
      error: 'Forbidden',
    };
  }

  return {
    success: true,
    user: session,
    staff: session,
  };
}

export const requireRole = requireDeveloperRole;

export async function isDeveloperAdmin(requestOrSession) {
  return hasDeveloperRole(requestOrSession, ['admin', 'superadmin']);
}

export async function isSuperAdmin(requestOrSession) {
  return hasDeveloperRole(requestOrSession, ['admin', 'superadmin']);
}

export async function isLeadDeveloper(requestOrSession) {
  return hasDeveloperRole(requestOrSession, ['developer', 'admin']);
}

export async function isDeveloper(requestOrSession) {
  return hasDeveloperRole(requestOrSession, ['developer', 'admin']);
}

export async function isDeveloperManager(requestOrSession) {
  return hasDeveloperRole(requestOrSession, ['manager', 'admin']);
}

export async function isDeveloperMarketer(requestOrSession) {
  return hasDeveloperRole(requestOrSession, ['marketer', 'admin']);
}

export async function isDeveloperSupport(requestOrSession) {
  return hasDeveloperRole(requestOrSession, ['support', 'admin']);
}

export async function getDeveloperRoles() {
  return Object.keys(DEVELOPER_ROLE_LABELS).map((slug, idx) => ({
    id: idx + 1,
    slug,
    name: DEVELOPER_ROLE_LABELS[slug],
    description: `Platform role: ${DEVELOPER_ROLE_LABELS[slug]}`,
    developers_count: 0,
  }));
}

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

    // Direct developer module_permissions lookup (developer combines directly with modules)
    const permRes = await queryDb(
      `SELECT 1 FROM module_permissions mp
       JOIN modules m ON mp.module_id = m.id
       WHERE mp.developer_id = $1 AND mp.can_view = TRUE AND LOWER(m.slug) = ANY($2::text[])
       LIMIT 1`,
      [session.id, slugs]
    ).catch(() => ({ rows: [] }));

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

/**
 * Direct email/password authentication handler for developers
 */
export async function authenticateAdmin(email, password, { ip = '127.0.0.1', userAgent = 'Unknown' } = {}) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  const devRes = await queryDb(
    `SELECT d.*, 'developer' as role, 'Developer' as role_name
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
    } catch (e) {}
    const err = new Error('Your administrator account has been deactivated.');
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
    } catch (e) {}
    throw new Error('Invalid email or password.');
  }

  // Check if account email is verified
  if (dev.email_verified === false) {
    const err = new Error('Your developer account has not been verified yet. Please check your email for the activation link.');
    err.unverified = true;
    err.email = dev.email;
    throw err;
  }

  // If email is verified but stale verification token remains, clear it
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

// ============================================================================
// Developer Admin Helpers (Developers Table)
// ============================================================================

/**
 * Checks if the current requester is an active authenticated developer/superadmin.
 */
export async function isAdmin(request) {
  try {
    const session = await getAdminSession(request);
    return Boolean(session && session.isActive);
  } catch {
    return false;
  }
}

/**
 * Returns the authenticated developer user record.
 */
export async function getAdminUser(request) {
  try {
    const session = await getAdminSession(request);
    return session || null;
  } catch {
    return null;
  }
}

const DeveloperMiddleware = {
  // Constants
  DEVELOPER_ROLES,
  DEVELOPER_ROLE_LABELS,
  DEVELOPER_ROLE_PERMISSIONS,
  ROLE_PERMISSIONS,

  // Password & Auth
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  authenticateAdmin,

  // Session & Developer Roles
  getAdminSession,
  getDeveloperSession,
  getAuthenticatedUser,
  isStaff,
  authenticateStaff,
  getDeveloperRole,
  hasDeveloperRole,
  hasRole,
  requireDeveloperRole,
  requireRole,
  isDeveloperAdmin,
  isSuperAdmin,
  isLeadDeveloper,
  isDeveloper,
  isDeveloperManager,
  isDeveloperMarketer,
  isDeveloperSupport,
  getDeveloperRoles,
  hasModulePermission,
  hasDeveloperPermission,
  requireDeveloperPermission,

  // Developer Admin Helpers
  isAdmin,
  getAdminUser,
};

export default DeveloperMiddleware;


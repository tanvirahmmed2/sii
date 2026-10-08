import jwt from 'jsonwebtoken';
import { queryDb } from '../database/db.js';
import { JWT_SECRET, STAFF_TOKEN } from '../database/secret.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';

export function verifyJWT(token) {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch {
    return null;
  }
}

export const STAFF_COOKIE_NAME = STAFF_TOKEN || 'hiesci-staff';

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

/**
 * Extracts and decodes staff session from request or cookies
 */
export async function getStaffSession(request) {
  try {
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(STAFF_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    // 1. Look up active session
    let sessRes = await queryDb(
      `SELECT ss.id AS session_id, ss.website_id, ss.staff_id, ss.is_active, ss.expires_at,
              ws.id, ws.name, ws.email, ws.number, ws.address, ws.is_active AS staff_active,
              ws.is_registered, ws.is_two_factor_enabled, ws.image, ws.image_id, ws.grade_id,
              ws.date_of_birth, ws.nationality, ws.blood_group, ws.gender, ws.nid_number,
              ws.bio, ws.username,
              w.name AS website_name, w.subdomain AS website_subdomain, w.custom_domain AS website_custom_domain
       FROM staff_sessions ss
       JOIN website_staffs ws ON ws.id = ss.staff_id
       JOIN websites w ON w.id = ss.website_id
       WHERE ss.token = $1 AND ss.is_active = TRUE AND ss.expires_at > CURRENT_TIMESTAMP AND ws.is_active = TRUE
       LIMIT 1`,
      [token]
    );

    // Auto-heal session if JWT is valid and staff exists in DB
    if (sessRes.rows.length === 0) {
      const staffCheck = await queryDb(
        `SELECT ws.*, w.id AS web_id, w.name AS website_name, w.subdomain AS website_subdomain, w.custom_domain AS website_custom_domain
         FROM website_staffs ws
         JOIN websites w ON w.id = ws.website_id
         WHERE ws.id = $1 AND ws.is_active = TRUE
         LIMIT 1`,
        [decoded.id]
      );

      if (staffCheck.rows.length > 0) {
        const staffRow = staffCheck.rows[0];
        try {
          await queryDb(
            `INSERT INTO staff_sessions (website_id, staff_id, token, expires_at, is_active)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE)
             ON CONFLICT (token) DO UPDATE SET is_active = TRUE, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days'`,
            [staffRow.web_id, staffRow.id, token]
          );

          sessRes = await queryDb(
            `SELECT ss.id AS session_id, ss.website_id, ss.staff_id, ss.is_active, ss.expires_at,
                    ws.id, ws.name, ws.email, ws.number, ws.address, ws.is_active AS staff_active,
                    ws.is_registered, ws.is_two_factor_enabled, ws.image, ws.image_id, ws.grade_id,
                    ws.date_of_birth, ws.nationality, ws.blood_group, ws.gender, ws.nid_number,
                    ws.bio, ws.username,
                    w.name AS website_name, w.subdomain AS website_subdomain, w.custom_domain AS website_custom_domain
             FROM staff_sessions ss
             JOIN website_staffs ws ON ws.id = ss.staff_id
             JOIN websites w ON w.id = ss.website_id
             WHERE ss.token = $1 AND ss.is_active = TRUE LIMIT 1`,
            [token]
          );
        } catch {
          // Non-fatal
        }
      }
    }

    if (sessRes.rows.length === 0) return null;
    const row = sessRes.rows[0];

    // Non-blocking ping last_active_at
    queryDb(
      `UPDATE staff_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.session_id]
    ).catch(() => {});

    // 2. Fetch staff module permissions (scoped to website modules available for this website's package)
    const permsRes = await queryDb(
      `SELECT wmp.website_module_id, wmp.can_view, wmp.can_create, wmp.can_edit, wmp.can_delete,
              wm.name AS module_name, wm.slug AS module_slug, wm.icon AS module_icon
       FROM website_modules_permissions wmp
       JOIN website_modules wm ON wm.id = wmp.website_module_id
       JOIN websites w ON w.id = wmp.website_id
       LEFT JOIN subscriptions s ON (s.id = w.subscription_id OR s.website_id = w.id)
       WHERE wmp.staff_id = $1 AND wmp.website_id = $2 AND wm.is_active = TRUE
         AND (
           EXISTS (
             SELECT 1 FROM package_website_modules pwm 
             WHERE pwm.package_id = s.package_id AND pwm.website_module_id = wm.id
           )
           OR s.package_id IS NULL
         )`,
      [row.id, row.website_id]
    );

    const permissions = {};
    const allowedModules = [];

    for (const p of permsRes.rows) {
      permissions[p.module_slug] = {
        can_view: Boolean(p.can_view),
        can_create: Boolean(p.can_create),
        can_edit: Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
        module_name: p.module_name,
        website_module_id: p.website_module_id,
        module_icon: p.module_icon,
      };
      if (p.can_view) {
        allowedModules.push(p.module_slug);
      }
    }

    const staffUser = {
      id: row.id,
      websiteId: row.website_id,
      name: row.name,
      email: row.email,
      number: row.number,
      phone: row.number,
      address: row.address,
      isActive: Boolean(row.staff_active),
      isRegistered: Boolean(row.is_registered),
      isTwoFactorEnabled: Boolean(row.is_two_factor_enabled),
      image: row.image,
      imageId: row.image_id,
      gradeId: row.grade_id,
      dateOfBirth: row.date_of_birth,
      nationality: row.nationality,
      bloodGroup: row.blood_group,
      gender: row.gender,
      nidNumber: row.nid_number,
      bio: row.bio,
      username: row.username,
      websiteName: row.website_name,
      websiteSubdomain: row.website_subdomain,
      websiteCustomDomain: row.website_custom_domain,
      permissions,
      allowedModules,
      token,
      sessionId: row.session_id,
    };

    return {
      staff: staffUser,
      user: staffUser,
      session: {
        id: row.session_id,
        websiteId: row.website_id,
        token,
        expiresAt: row.expires_at,
      },
      permissions,
      allowedModules,
    };
  } catch (err) {
    console.error('Error fetching staff session:', err);
    return null;
  }
}

/**
 * Compatibility helper to retrieve the logged-in staff user
 */
export async function getStaffUser(request) {
  const sessionData = await getStaffSession(request);
  return sessionData ? sessionData.staff : null;
}

/**
 * Check if the current requester is an active authenticated staff member
 */
export async function isStaff(request) {
  const sessionData = await getStaffSession(request);
  return Boolean(sessionData && sessionData.staff && sessionData.staff.isActive);
}

/**
 * Check whether a staff member has permission for a specific module action
 * @param {Object} staffOrSession - Staff object or session
 * @param {string} moduleSlug - e.g. 'sis', 'attendance', 'fees', 'lms', etc.
 * @param {'view'|'create'|'edit'|'delete'} action
 */
export function hasStaffModulePermission(staffOrSession, moduleSlug, action = 'view') {
  if (!staffOrSession || !moduleSlug) return false;
  const staff = staffOrSession.staff || staffOrSession;
  const permissions = staff.permissions || {};
  const modPerm = permissions[moduleSlug];
  if (!modPerm) return false;

  switch (action) {
    case 'create':
      return Boolean(modPerm.can_create);
    case 'edit':
    case 'update':
      return Boolean(modPerm.can_edit);
    case 'delete':
      return Boolean(modPerm.can_delete);
    case 'view':
    default:
      return Boolean(modPerm.can_view);
  }
}

/**
 * Creates an active staff session record in staff_sessions
 */
export async function createStaffSession({ websiteId, staffId, token, request, expiresAt }) {
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
      `INSERT INTO staff_sessions (website_id, staff_id, token, ip_address, user_agent, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       ON CONFLICT (token) DO UPDATE SET
         is_active = TRUE,
         expires_at = EXCLUDED.expires_at,
         last_active_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [websiteId, staffId, token, ip, userAgent, exp]
    );

    return res.rows[0];
  } catch (err) {
    console.error('Error creating staff session:', err);
    return null;
  }
}

/**
 * Revokes a single staff session token
 */
export async function revokeStaffSession(token) {
  try {
    if (!token) return false;
    await queryDb(`UPDATE staff_sessions SET is_active = FALSE WHERE token = $1`, [token]);
    return true;
  } catch (err) {
    console.error('Error revoking staff session:', err);
    return false;
  }
}

/**
 * Revokes all active sessions for a staff member
 */
export async function revokeAllStaffSessions(staffId, websiteId = null) {
  try {
    if (!staffId) return false;
    if (websiteId) {
      await queryDb(
        `UPDATE staff_sessions SET is_active = FALSE WHERE staff_id = $1 AND website_id = $2`,
        [staffId, websiteId]
      );
    } else {
      await queryDb(`UPDATE staff_sessions SET is_active = FALSE WHERE staff_id = $1`, [staffId]);
    }
    return true;
  } catch (err) {
    console.error('Error revoking all staff sessions:', err);
    return false;
  }
}

const StaffMiddleware = {
  STAFF_COOKIE_NAME,
  getStaffSession,
  getStaffUser,
  isStaff,
  hasStaffModulePermission,
  createStaffSession,
  revokeStaffSession,
  revokeAllStaffSessions,
};

export default StaffMiddleware;

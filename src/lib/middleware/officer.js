import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryDb } from '../database/db.js';
import { JWT_SECRET, OFFICER_TOKEN } from '../database/secret.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';

export const OFFICER_COOKIE_NAME = OFFICER_TOKEN || 'hiesci-officer';

// Password helpers
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

// JWT helpers
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

export async function setOfficerSessionCookie(response, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  if (response && response.cookies) {
    response.cookies.set(OFFICER_COOKIE_NAME, token, cookieOptions);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.set(OFFICER_COOKIE_NAME, token, cookieOptions);
    } catch {}
  }
}

export async function clearOfficerSessionCookie(response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };

  if (response && response.cookies) {
    response.cookies.set(OFFICER_COOKIE_NAME, '', cookieOptions);
    response.cookies.delete?.(OFFICER_COOKIE_NAME);
  } else {
    try {
      const cookieStore = await getCookieStore();
      cookieStore?.delete(OFFICER_COOKIE_NAME);
    } catch {}
  }
}

let _officerSchemaEnsured = false;
export async function ensureOfficerSchema() {
  if (_officerSchemaEnsured) return;
  _officerSchemaEnsured = true;
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS website_officers (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        department VARCHAR(100) DEFAULT 'General',
        designation VARCHAR(100) DEFAULT 'Officer',
        nid_number VARCHAR(100),
        gender VARCHAR(20) DEFAULT 'male',
        blood_group VARCHAR(10),
        date_of_birth DATE,
        religion VARCHAR(50),
        address TEXT,
        permanent_address TEXT,
        joining_date DATE DEFAULT CURRENT_DATE,
        salary NUMERIC(12, 2) DEFAULT 0.00,
        photo_url TEXT,
        photo_id VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        recovery_token VARCHAR(255),
        recovery_token_expires TIMESTAMPTZ,
        two_factor_code VARCHAR(10),
        two_factor_expires TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        is_registered BOOLEAN DEFAULT FALSE,
        is_two_factor_enabled BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMPTZ,
        bio TEXT,
        username VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(website_id, email),
        UNIQUE(website_id, username)
      );

      CREATE TABLE IF NOT EXISTS website_officer_permissions (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        officer_id BIGINT NOT NULL REFERENCES website_officers(id) ON DELETE CASCADE,
        website_module_id BIGINT NOT NULL REFERENCES website_modules(id) ON DELETE CASCADE,
        can_view BOOLEAN DEFAULT TRUE,
        can_create BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(officer_id, website_module_id)
      );

      CREATE TABLE IF NOT EXISTS website_officer_login_sessions (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        officer_id BIGINT NOT NULL REFERENCES website_officers(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_info TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMPTZ NOT NULL,
        last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ws_officers_website ON website_officers(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_officers_email ON website_officers(website_id, email);
      CREATE INDEX IF NOT EXISTS idx_ws_officers_vtoken ON website_officers(verification_token);
      CREATE INDEX IF NOT EXISTS idx_ws_officers_rtoken ON website_officers(recovery_token);
      CREATE INDEX IF NOT EXISTS idx_ws_officer_perms_officer ON website_officer_permissions(officer_id);
      CREATE INDEX IF NOT EXISTS idx_ws_officer_perms_website ON website_officer_permissions(website_id);
      CREATE INDEX IF NOT EXISTS idx_ws_officer_perms_module ON website_officer_permissions(website_module_id);
      CREATE INDEX IF NOT EXISTS idx_ws_officer_sessions_token ON website_officer_login_sessions(token);
    `);
  } catch (err) {
    console.warn('[OfficerSchema] ensureOfficerSchema notice:', err?.message);
  }
}

/**
 * Creates an active officer session record in website_officer_login_sessions
 */
export async function createOfficerSession({ websiteId, officerId, token, request, expiresAt }) {
  try {
    await ensureOfficerSchema().catch(() => {});
    let ip = null;
    let userAgent = null;

    if (request) {
      ip = request.headers?.get?.('x-forwarded-for') || request.headers?.get?.('x-real-ip') || null;
      if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
      userAgent = request.headers?.get?.('user-agent') || null;
    }

    const exp = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await queryDb(
      `INSERT INTO website_officer_login_sessions (website_id, officer_id, token, ip_address, user_agent, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       ON CONFLICT (token) DO UPDATE SET
         is_active = TRUE,
         expires_at = EXCLUDED.expires_at,
         last_active_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [websiteId, officerId, token, ip, userAgent, exp]
    );

    return res.rows[0];
  } catch (err) {
    console.error('Error creating officer session:', err);
    return null;
  }
}

/**
 * Extracts and decodes officer session from request or cookies
 */
export async function getOfficerSession(request) {
  try {
    await ensureOfficerSchema().catch(() => {});
    let token = null;

    if (request) {
      const authHeader = request.headers?.get?.('authorization') || request.headers?.get?.('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (request.cookies?.get) {
        token = request.cookies.get(OFFICER_COOKIE_NAME)?.value;
      }
    }

    if (!token) {
      const cookieStore = await getCookieStore();
      if (cookieStore) {
        token = cookieStore.get(OFFICER_COOKIE_NAME)?.value;
      }
    }

    if (!token) return null;

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) return null;

    // 1. Look up active session
    let sessRes = await queryDb(
      `SELECT os.id AS session_id, os.website_id, os.officer_id, os.is_active, os.expires_at,
              wo.id, wo.name, wo.email, wo.phone, wo.department, wo.designation, wo.address,
              wo.permanent_address, wo.is_active AS officer_active, wo.is_registered,
              wo.is_two_factor_enabled, wo.photo_url, wo.nid_number, wo.gender, wo.blood_group,
              wo.date_of_birth, wo.joining_date, wo.salary, wo.bio, wo.username,
              w.name AS website_name, w.subdomain AS website_subdomain, w.custom_domain AS website_custom_domain
       FROM website_officer_login_sessions os
       JOIN website_officers wo ON wo.id = os.officer_id
       JOIN websites w ON w.id = os.website_id
       WHERE os.token = $1 AND os.is_active = TRUE AND os.expires_at > CURRENT_TIMESTAMP AND wo.is_active = TRUE
       LIMIT 1`,
      [token]
    );

    // Auto-heal session if JWT is valid and officer exists
    if (sessRes.rows.length === 0) {
      const officerCheck = await queryDb(
        `SELECT wo.*, w.id AS web_id, w.name AS website_name, w.subdomain AS website_subdomain, w.custom_domain AS website_custom_domain
         FROM website_officers wo
         JOIN websites w ON w.id = wo.website_id
         WHERE wo.id = $1 AND wo.is_active = TRUE
         LIMIT 1`,
        [decoded.id]
      );

      if (officerCheck.rows.length > 0) {
        const oRow = officerCheck.rows[0];
        try {
          await queryDb(
            `INSERT INTO website_officer_login_sessions (website_id, officer_id, token, expires_at, is_active)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE)
             ON CONFLICT (token) DO UPDATE SET is_active = TRUE, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days'`,
            [oRow.web_id, oRow.id, token]
          );

          sessRes = await queryDb(
            `SELECT os.id AS session_id, os.website_id, os.officer_id, os.is_active, os.expires_at,
                    wo.id, wo.name, wo.email, wo.phone, wo.department, wo.designation, wo.address,
                    wo.permanent_address, wo.is_active AS officer_active, wo.is_registered,
                    wo.is_two_factor_enabled, wo.photo_url, wo.nid_number, wo.gender, wo.blood_group,
                    wo.date_of_birth, wo.joining_date, wo.salary, wo.bio, wo.username,
                    w.name AS website_name, w.subdomain AS website_subdomain, w.custom_domain AS website_custom_domain
             FROM website_officer_login_sessions os
             JOIN website_officers wo ON wo.id = os.officer_id
             JOIN websites w ON w.id = os.website_id
             WHERE os.token = $1 AND os.is_active = TRUE LIMIT 1`,
            [token]
          );
        } catch {}
      }
    }

    if (sessRes.rows.length === 0) return null;
    const row = sessRes.rows[0];

    // Non-blocking ping last_active_at
    queryDb(
      `UPDATE website_officer_login_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.session_id]
    ).catch(() => {});

    // 2. Fetch officer permissions (scoped to website modules available for this website's package)
    const permsRes = await queryDb(
      `SELECT wop.website_module_id, wop.can_view, wop.can_create, wop.can_edit, wop.can_delete,
              wm.name AS module_name, wm.slug AS module_slug, wm.icon AS module_icon
       FROM website_officer_permissions wop
       JOIN website_modules wm ON wm.id = wop.website_module_id
       JOIN websites w ON w.id = wop.website_id
       LEFT JOIN subscriptions s ON (s.id = w.subscription_id OR s.website_id = w.id)
       WHERE wop.officer_id = $1 AND wop.website_id = $2 AND wm.is_active = TRUE
         AND (
           EXISTS (
             SELECT 1 FROM package_modules pm 
             WHERE pm.package_id = s.package_id AND pm.website_module_id = wm.id
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

    const officerUser = {
      id: row.id,
      officer_id: row.id,
      websiteId: row.website_id,
      website_id: row.website_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      number: row.phone,
      department: row.department,
      designation: row.designation,
      address: row.address,
      permanentAddress: row.permanent_address,
      isActive: Boolean(row.officer_active),
      isRegistered: Boolean(row.is_registered),
      isTwoFactorEnabled: Boolean(row.is_two_factor_enabled),
      photoUrl: row.photo_url,
      nidNumber: row.nid_number,
      gender: row.gender,
      bloodGroup: row.blood_group,
      dateOfBirth: row.date_of_birth,
      joiningDate: row.joining_date,
      salary: row.salary,
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
      officer: officerUser,
      user: officerUser,
      website_id: row.website_id,
      websiteId: row.website_id,
      officer_id: row.id,
      officerId: row.id,
      session: {
        id: row.session_id,
        websiteId: row.website_id,
        website_id: row.website_id,
        token,
        expiresAt: row.expires_at,
      },
      permissions,
      allowedModules,
    };
  } catch (err) {
    console.error('Error fetching officer session:', err);
    return null;
  }
}

/**
 * Returns the currently logged-in officer user
 */
export async function getOfficerUser(request) {
  const sessionData = await getOfficerSession(request);
  return sessionData ? sessionData.officer : null;
}

/**
 * Checks if requester is an active authenticated officer
 */
export async function isOfficer(request) {
  const sessionData = await getOfficerSession(request);
  return Boolean(sessionData && sessionData.officer && sessionData.officer.isActive);
}

/**
 * Checks whether an officer has permission for a specific module action
 */
export function hasOfficerModulePermission(officerOrSession, moduleSlug, action = 'view') {
  if (!officerOrSession || !moduleSlug) return false;
  const officer = officerOrSession.officer || officerOrSession;
  const permissions = officer.permissions || {};
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
 * Revokes an officer session token
 */
export async function revokeOfficerSession(token) {
  try {
    if (!token) return false;
    await queryDb(`UPDATE website_officer_login_sessions SET is_active = FALSE WHERE token = $1`, [token]);
    return true;
  } catch (err) {
    console.error('Error revoking officer session:', err);
    return false;
  }
}

/**
 * Revokes all sessions for an officer
 */
export async function revokeAllOfficerSessions(officerId, websiteId = null) {
  try {
    if (!officerId) return false;
    if (websiteId) {
      await queryDb(
        `UPDATE website_officer_login_sessions SET is_active = FALSE WHERE officer_id = $1 AND website_id = $2`,
        [officerId, websiteId]
      );
    } else {
      await queryDb(`UPDATE website_officer_login_sessions SET is_active = FALSE WHERE officer_id = $1`, [officerId]);
    }
    return true;
  } catch (err) {
    console.error('Error revoking all officer sessions:', err);
    return false;
  }
}

const OfficerMiddleware = {
  OFFICER_COOKIE_NAME,
  ensureOfficerSchema,
  getOfficerSession,
  getOfficerUser,
  isOfficer,
  hasOfficerModulePermission,
  createOfficerSession,
  revokeOfficerSession,
  revokeAllOfficerSessions,
  hashPassword,
  comparePassword,
  signJWT,
  generateToken,
  verifyJWT,
  setOfficerSessionCookie,
  clearOfficerSessionCookie,
};

export default OfficerMiddleware;

/**
 * Website user (end-user) authentication middleware for creator-hosted websites.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '../database/secret.js';
import { query } from '../database/db.js';

export const WEBSITE_AUTH_COOKIE = 'website_user_token';
const DEFAULT_JWT_SECRET = JWT_SECRET || 'website_user_jwt_secret_key_2026';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function generateWebsiteToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn });
}

export function verifyWebsiteToken(token) {
  try {
    return jwt.verify(token, DEFAULT_JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Resolve which website this request is for, based on the [slug] param.
 */
export async function resolveWebsiteFromRequest(request, context) {
  try {
    const params = await context?.params;
    const slug = params?.slug;
    if (!slug) return null;

    const res = await query(
      `SELECT id, creator_id, name, slug, domain, is_active, settings
       FROM creator_websites WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (error) {
    console.error('resolveWebsiteFromRequest error:', error);
    return null;
  }
}

/**
 * Get the currently authenticated website user from request cookie/header.
 */
export async function getWebsiteUserSession(request) {
  try {
    let token = null;
    const authHeader = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request?.cookies?.get) {
      token = request.cookies.get(WEBSITE_AUTH_COOKIE)?.value;
    }
    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(WEBSITE_AUTH_COOKIE)?.value;
      } catch {}
    }
    if (!token) return null;

    const decoded = verifyWebsiteToken(token);
    if (!decoded?.id) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get user roles and permissions for a given website.
 */
export async function getUserRolesAndPermissions(userId, websiteId) {
  try {
    const res = await query(
      `SELECT r.name as role, r.permissions
       FROM website_user_roles ur
       JOIN website_roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND ur.website_id = $2`,
      [userId, websiteId]
    );
    return res.rows;
  } catch {
    return [];
  }
}

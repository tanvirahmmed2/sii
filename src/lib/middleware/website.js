import { NextResponse } from 'next/server.js';
import { queryDb } from '../database/db.js';
import { BASE_DOMAIN, BASE_URL } from '../database/secret.js';
import {
  resolveWebsiteFromRequest,
  getWebsiteUserSession,
  getUserRolesAndPermissions,
  generateWebsiteToken,
  verifyWebsiteToken,
  WEBSITE_AUTH_COOKIE,
} from './creator.js';

export {
  resolveWebsiteFromRequest,
  getWebsiteUserSession,
  getUserRolesAndPermissions,
  generateWebsiteToken,
  verifyWebsiteToken,
  WEBSITE_AUTH_COOKIE,
};

/**
 * Extracts the base host from request headers or environment.
 * If running on localhost:3000, returns 'localhost:3000'.
 */
export function getBaseDomain(request = null) {
  if (request) {
    const forwardedHost = request.headers?.get?.('x-forwarded-host');
    const host = request.headers?.get?.('host');
    if (forwardedHost) return forwardedHost.split(',')[0].trim();
    if (host) return host.trim();
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.host;
  }
  return BASE_DOMAIN || 'localhost:3000';
}

/**
 * Extracts the tenant website domain/subdomain from request host or pathname.
 */
export function getWebsiteDomain(request) {
  if (!request) return null;

  const url = request.nextUrl || (request.url ? new URL(request.url) : null);
  const pathname = url?.pathname || '';

  // 1. Check path prefix: /website/[domain] or /websites/[domain] or /webite/[domain]
  const pathMatch = pathname.match(/^\/(?:websites|website|webite)\/([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]).toLowerCase();
  }

  // 2. Check query param ?domain= or ?subdomain=
  const paramDomain = url?.searchParams?.get('domain') || url?.searchParams?.get('subdomain');
  if (paramDomain) {
    return paramDomain.trim().toLowerCase();
  }

  // 3. Extract from hostname
  const host = request.headers?.get?.('x-forwarded-host') || request.headers?.get?.('host') || url?.host || '';
  const cleanHost = host.split(':')[0].toLowerCase();
  const base = getBaseDomain(request).split(':')[0].toLowerCase();

  // If host is different from the main base domain
  if (cleanHost && cleanHost !== base && cleanHost !== 'localhost' && cleanHost !== '127.0.0.1') {
    // If it's a subdomain like "oxford.localhost" or "oxford.domain.com"
    if (cleanHost.endsWith(`.${base}`)) {
      return cleanHost.replace(`.${base}`, '');
    }
    // Or if cleanHost is a standalone custom domain like "oxford-school.edu"
    return cleanHost;
  }

  return null;
}

/**
 * Fetches website record strictly from database without any fallback dummy data.
 */
export async function fetchWebsiteByDomain(domain) {
  if (!domain) return null;
  const clean = String(domain).trim().toLowerCase();

  try {
    const res = await queryDb(
      `SELECT id, creator_id, name, slug, subdomain, subdomain AS domain, custom_domain,
              institution_type, eiin_number, contact_email, contact_phone, address,
              primary_color, theme, status, is_maintenance_mode,
              (status = 'active') AS is_active,
              (status = 'active' AND is_maintenance_mode = false) AS is_published
       FROM websites 
       WHERE LOWER(slug) = LOWER($1) 
          OR LOWER(subdomain) = LOWER($1) 
          OR LOWER(custom_domain) = LOWER($1)
          OR LOWER(subdomain) LIKE LOWER($2)
       LIMIT 1`,
      [clean, `${clean}.%`]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (err) {
    console.error('fetchWebsiteByDomain error:', err);
    return null;
  }
}

/**
 * Middleware handler to extract domain and redirect/rewrite to /website/[domain] or /websites/[domain]
 */
export function handleWebsiteMiddleware(request) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Ignore internal assets, APIs, and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return null;
  }

  // If user requests singular /website/[domain] or typo /webite/[domain], redirect to /websites/[domain]
  const legacyMatch = pathname.match(/^\/(?:website|webite)\/([^/?#]+)(.*)$/i);
  if (legacyMatch) {
    const domain = legacyMatch[1];
    const rest = legacyMatch[2] || '';
    url.pathname = `/websites/${domain}${rest}`;
    return NextResponse.redirect(url);
  }

  // Extract subdomain or custom domain from host
  const tenantDomain = getWebsiteDomain(request);
  if (tenantDomain && !pathname.startsWith('/websites')) {
    // Rewrite root request on tenant domain to /websites/[domain]
    url.pathname = `/websites/${tenantDomain}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  return null;
}

export default {
  getBaseDomain,
  getWebsiteDomain,
  fetchWebsiteByDomain,
  handleWebsiteMiddleware,
  resolveWebsiteFromRequest,
  getWebsiteUserSession,
  getUserRolesAndPermissions,
};

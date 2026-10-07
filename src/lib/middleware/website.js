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
 * Extracts the base host configured for the SaaS platform.
 */
export function getBaseDomain(request = null) {
  if (BASE_DOMAIN && BASE_DOMAIN.trim() !== '') {
    return BASE_DOMAIN.trim().toLowerCase();
  }
  if (typeof window !== 'undefined' && window.location?.host) {
    const h = window.location.host.toLowerCase();
    if (h.includes('localhost') || h.includes('127.0.0.1')) {
      return h;
    }
  }
  if (request) {
    const forwardedHost = request.headers?.get?.('x-forwarded-host');
    const host = request.headers?.get?.('host');
    const incoming = (forwardedHost ? forwardedHost.split(',')[0] : host || '').trim().toLowerCase();
    if (incoming.includes('.localhost')) {
      const port = incoming.split(':')[1];
      return port ? `localhost:${port}` : 'localhost';
    }
    if (incoming.includes('localhost') || incoming.includes('127.0.0.1')) {
      return incoming;
    }
  }
  return 'localhost:3000';
}

/**
 * Extracts the tenant website domain/subdomain from request host or pathname.
 * Returns null if the request is on the main SaaS platform.
 */
export function getWebsiteDomain(request) {
  if (!request) return null;

  const url = request.nextUrl || (request.url ? new URL(request.url) : null);
  const rawHost = request.headers?.get?.('x-forwarded-host') || request.headers?.get?.('host') || url?.host || '';
  const cleanHostWithPort = rawHost.split(',')[0].trim().toLowerCase();
  const cleanHost = cleanHostWithPort.split(':')[0]; // strip port

  const baseHostWithPort = getBaseDomain(request);
  const baseHost = baseHostWithPort.split(':')[0]; // strip port

  // 1. If host matches the main platform host => this is the main SaaS website
  if (
    !cleanHost ||
    cleanHost === baseHost ||
    cleanHost === `www.${baseHost}` ||
    ((baseHost === 'localhost' || baseHost === '127.0.0.1') && (cleanHost === 'localhost' || cleanHost === '127.0.0.1'))
  ) {
    return null;
  }

  // 2. Subdomain of production base domain (e.g. oxford.educraft.io)
  if (baseHost !== 'localhost' && baseHost !== '127.0.0.1' && cleanHost.endsWith(`.${baseHost}`)) {
    const sub = cleanHost.slice(0, -(baseHost.length + 1)).trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  // 3. Subdomain of localhost (e.g. oxford.localhost or oxford.localhost:3000)
  if (cleanHost.endsWith('.localhost')) {
    const sub = cleanHost.replace('.localhost', '').trim();
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  // 4. Standalone Custom Domain (e.g. oxfordschool.edu, myacademy.org)
  return cleanHost;
}

/**
 * Fetches website record strictly from database.
 */
export async function fetchWebsiteByDomain(domain) {
  if (!domain) return null;
  const clean = String(domain).trim().toLowerCase();

  try {
    const res = await queryDb(
      `SELECT id, creator_id, name, slug, subdomain, subdomain AS domain, custom_domain,
              custom_domain_verified, institution_type, eiin_number, contact_email, contact_phone, address,
              primary_color, secondary_color, theme, status, is_maintenance_mode,
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
 * Middleware handler:
 * - If request is for baseurl.com: passes through to main SaaS platform.
 * - If request is for subdomain.baseurl.com or customdomain.com:
 *     - Rewrites frontend paths to app/[domain] folder.
 *     - Rewrites API requests to /api/[domain] routes.
 */
export function handleWebsiteMiddleware(request) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Ignore static assets and Next.js internal files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icon.png') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.match(/\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|css|js|map)$/i)
  ) {
    return null;
  }

  const tenantDomain = getWebsiteDomain(request);

  // CASE 1: Main SaaS Platform request (baseurl.com or localhost)
  if (!tenantDomain) {
    // If user accesses preview /websites/[domain] or /website/[domain] on base domain, rewrite to /[domain]
    const legacyMatch = pathname.match(/^\/(?:websites|website|webite)\/([^/?#]+)(.*)$/i);
    if (legacyMatch) {
      const domain = legacyMatch[1];
      const rest = legacyMatch[2] || '';
      url.pathname = `/${domain}${rest}`;
      return NextResponse.rewrite(url);
    }
    // Otherwise allow normal main SaaS website routing
    return null;
  }

  // CASE 2: Tenant Website request (subdomain.baseurl.com or customdomain.com)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-website-domain', tenantDomain);
  requestHeaders.set('x-domain', tenantDomain);

  // 2A: Handle API routes for tenant
  if (pathname.startsWith('/api')) {
    // Allow creator/marketing platform APIs to pass through if requested
    if (pathname.startsWith('/api/marketing') || pathname.startsWith('/api/auth')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // If already scoped to tenant API (e.g. /api/[domain]/...)
    if (pathname === `/api/${tenantDomain}` || pathname.startsWith(`/api/${tenantDomain}/`)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Rewrite /api/... to /api/[domain]/... (e.g. /api/notices -> /api/oxford/notices)
    const apiRest = pathname === '/api' ? '' : pathname.slice(4);
    url.pathname = `/api/${tenantDomain}${apiRest}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // 2B: Handle Frontend routes for tenant
  // If path already starts with /[domain], pass through
  if (pathname === `/${tenantDomain}` || pathname.startsWith(`/${tenantDomain}/`)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // If path uses legacy /websites/[domain], clean it
  const legacyMatch = pathname.match(/^\/(?:websites|website|webite)\/[^/?#]+(.*)$/i);
  if (legacyMatch) {
    const rest = legacyMatch[1] || '';
    url.pathname = `/${tenantDomain}${rest}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Rewrite root or internal path to /[domain] (e.g. / -> /oxford, /notices -> /oxford/notices)
  url.pathname = `/${tenantDomain}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
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

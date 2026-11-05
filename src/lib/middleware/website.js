import { NextResponse } from 'next/server.js';
import { queryDb } from '../database/db.js';
import {
  BASE_DOMAIN,
  BASE_HOST,
  BASE_URL,
  getBaseUrl,
  getBaseDomain,
  getWebsiteDomain,
} from '../database/secret.js';
import {
  resolveWebsiteFromRequest,
  resolveWebsite,
  invalidateWebsiteCache,
  clearWebsiteCache,
} from './websiteResolver.js';
import {
  getWebsiteUserSession,
  getUserRolesAndPermissions,
  generateWebsiteToken,
  verifyWebsiteToken,
  WEBSITE_AUTH_COOKIE,
} from './creator.js';

export {
  resolveWebsiteFromRequest,
  resolveWebsite,
  invalidateWebsiteCache,
  clearWebsiteCache,
  getWebsiteUserSession,
  getUserRolesAndPermissions,
  generateWebsiteToken,
  verifyWebsiteToken,
  WEBSITE_AUTH_COOKIE,
  getBaseDomain,
  getWebsiteDomain,
  getBaseUrl,
};

/**
 * Fetches website record using dedicated resolver with in-memory caching and coalescing.
 */
export async function fetchWebsiteByDomain(domain) {
  if (!domain) return null;
  return resolveWebsite(domain);
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

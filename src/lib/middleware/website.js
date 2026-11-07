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

export async function fetchWebsiteByDomain(domain) {
  if (!domain) return null;
  return resolveWebsite(domain);
}

export function handleWebsiteMiddleware(request) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

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

  if (!tenantDomain) {
    const legacyMatch = pathname.match(/^\/(?:websites|website|webite)\/([^/?#]+)(.*)$/i);
    if (legacyMatch) {
      const domain = legacyMatch[1];
      const rest = legacyMatch[2] || '';
      url.pathname = `/${domain}${rest}`;
      return NextResponse.rewrite(url);
    }
    return null;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-website-domain', tenantDomain);
  requestHeaders.set('x-domain', tenantDomain);

  if (pathname.startsWith('/api')) {
    if (pathname.startsWith('/api/marketing') || pathname.startsWith('/api/auth')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname === `/api/${tenantDomain}` || pathname.startsWith(`/api/${tenantDomain}/`)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const apiRest = pathname === '/api' ? '' : pathname.slice(4);
    url.pathname = `/api/${tenantDomain}${apiRest}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  if (pathname === `/${tenantDomain}` || pathname.startsWith(`/${tenantDomain}/`)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const legacyMatch = pathname.match(/^\/(?:websites|website|webite)\/[^/?#]+(.*)$/i);
  if (legacyMatch) {
    const rest = legacyMatch[1] || '';
    url.pathname = `/${tenantDomain}${rest}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

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

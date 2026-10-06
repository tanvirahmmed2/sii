import { NextResponse } from 'next/server';
import { BASE_URL, BASE_DOMAIN, extractBaseDomain } from './lib/database/secret.js';

/**
 * Extracts the base host configured for the SaaS platform.
 * Edge runtime safe: dynamically fetched from secret.js.
 */
function getPlatformBaseDomain(request) {
  const configuredBase = (BASE_DOMAIN || extractBaseDomain(BASE_URL) || '').trim();
  if (configuredBase) {
    return configuredBase.toLowerCase();
  }

  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = request.headers.get('host');
    const incoming = (forwardedHost ? forwardedHost.split(',')[0] : host || '').trim().toLowerCase();

    if (incoming.includes('.localhost')) {
      const port = incoming.split(':')[1];
      return port ? `localhost:${port}` : 'localhost';
    }
    if (incoming.includes('localhost') || incoming.includes('127.0.0.1')) {
      return incoming;
    }
    const clean = incoming.split(':')[0];
    const parts = clean.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return clean;
  }
  return 'localhost:3000';
}

/**
 * Extracts tenant identifier (subdomain or custom domain) from request host.
 * Returns null if the request is on the main SaaS platform.
 */
function getWebsiteDomain(request) {
  if (!request) return null;

  const url = request.nextUrl || (request.url ? new URL(request.url) : null);
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || url?.host || '';
  const cleanHostWithPort = rawHost.split(',')[0].trim().toLowerCase();
  const cleanHost = cleanHostWithPort.split(':')[0]; // strip port

  const baseHostWithPort = getPlatformBaseDomain(request);
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

  // 2. Subdomain of configured base domain (e.g. oxford.baseurl.com)
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
 * Next.js Proxy (Next.js 16+ convention replacing middleware):
 * 1. Base URL request (baseurl.com or localhost:3000) -> serves main SaaS platform.
 * 2. Tenant request (subdomain.baseurl.com or customdomain.com):
 *    - Frontend paths -> rewrites to app/[domain] frontend folder.
 *    - API paths -> rewrites to /api/[domain] routes.
 */
export function proxy(request) {
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
    return NextResponse.next();
  }

  let tenantDomain = getWebsiteDomain(request);

  // CASE 1: Main SaaS Platform request (baseurl.com or localhost)
  if (!tenantDomain) {
    // 1A: If user accesses preview /websites/[domain] or /website/[domain] on base domain, rewrite to /[domain]
    const legacyMatch = pathname.match(/^\/(?:websites|website|webite)\/([^/?#]+)(.*)$/i);
    if (legacyMatch) {
      const domain = legacyMatch[1];
      const rest = legacyMatch[2] || '';
      url.pathname = `/${domain}${rest}`;
      const response = NextResponse.rewrite(url);
      response.cookies.set('x-website-domain', domain, { path: '/' });
      return response;
    }

    // 1B: If an API request comes from a preview page on localhost/base domain
    if (pathname.startsWith('/api')) {
      if (!pathname.startsWith('/api/marketing') && !pathname.startsWith('/api/auth')) {
        let previewTenant = request.headers.get('x-website-domain') || request.headers.get('x-domain');
        if (!previewTenant) {
          previewTenant = request.cookies.get('x-website-domain')?.value || request.cookies.get('x-domain')?.value;
        }
        if (!previewTenant) {
          const referer = request.headers.get('referer');
          if (referer) {
            try {
              const refUrl = new URL(referer);
              const pathParts = refUrl.pathname.split('/').filter(Boolean);
              if (pathParts.length > 0) {
                const first = pathParts[0].toLowerCase();
                if ((first === 'websites' || first === 'website' || first === 'webite') && pathParts[1]) {
                  previewTenant = pathParts[1];
                } else if (!['creator', 'api', '_next', 'marketing', 'auth', 'admin'].includes(first)) {
                  previewTenant = first;
                }
              }
            } catch {}
          }
        }

        if (previewTenant && !pathname.startsWith(`/api/${previewTenant}`)) {
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set('x-website-domain', previewTenant);
          requestHeaders.set('x-domain', previewTenant);
          const apiRest = pathname === '/api' ? '' : pathname.slice(4);
          url.pathname = `/api/${previewTenant}${apiRest}`;
          return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
        }
      }
    }

    // 1C: If direct preview path /[domain]/... is visited on base domain, track tenant cookie
    const PLATFORM_RESERVED = new Set([
      'creator', 'developer', 'developer-auth', 'developers', 'api', '_next',
      'marketing', 'auth', 'admin', 'icon.png', 'favicon.ico', 'robots.txt',
      'sitemap.xml', 'about', 'blogs', 'careers', 'contact', 'faqs', 'packages',
      'policies', 'reviews', 'tutorials', 'updates', 'help', 'terms', 'privacy',
      'login', 'register'
    ]);
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const first = pathParts[0].toLowerCase();
      if (!PLATFORM_RESERVED.has(first)) {
        const response = NextResponse.next();
        response.cookies.set('x-website-domain', first, { path: '/' });
        return response;
      }
    }

    // Otherwise allow normal main SaaS website routing
    return NextResponse.next();
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

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)',
  ],
};

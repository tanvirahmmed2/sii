import { NextResponse } from 'next/server.js';
import {
  BASE_URL,
  BASE_DOMAIN,
  BASE_HOST,
  getBaseUrl,
  getWebsiteDomain,
} from './lib/database/secret.js';

export { getWebsiteDomain };

/**
 * Next.js Proxy (Next.js 16+ convention replacing middleware):
 * 1. Base URL request (baseurl.com or localhost:3000) -> directly serves main SaaS platform.
 * 2. Tenant request (subdomain.baseurl.com or customdomain.com):
 *    - Subdomain fetched by matching subdomain.base_url.
 *    - Frontend paths -> rewrites to app/[domain] frontend folder.
 *    - API paths -> rewrites to /api/[domain] routes.
 */
export function proxy(request) {
  const url = typeof request.nextUrl?.clone === 'function'
    ? request.nextUrl.clone()
    : new URL(request.url || 'http://localhost');
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

  // Tenant identifier: subdomain (from subdomain.base_url) or custom domain
  // Returns null for main SaaS website (base_url or localhost)
  const tenantDomain = getWebsiteDomain(request);

  const PLATFORM_RESERVED = new Set([
    'creator', 'developer', 'developer-auth', 'developers', 'api', '_next',
    'marketing', 'auth', 'admin', 'icon.png', 'favicon.ico', 'robots.txt',
    'sitemap.xml', 'about', 'blogs', 'careers', 'contact', 'faqs', 'packages',
    'policies', 'reviews', 'tutorials', 'updates', 'help', 'terms', 'privacy',
    'login', 'register'
  ]);

  // Legacy admission payment redirect: /admission/payment/:id -> /pay/admission-fees/:id
  const admissionPaymentMatch = pathname.match(/^(?:\/([^/]+))?\/admission\/payment(?:\/([^/?#]+))?\/?$/i);
  if (admissionPaymentMatch) {
    const possibleTenant = admissionPaymentMatch[1]?.toLowerCase();
    const applicantId = admissionPaymentMatch[2];
    const hasPathTenant = possibleTenant && !PLATFORM_RESERVED.has(possibleTenant) && possibleTenant !== 'admission';
    const targetPath = applicantId
      ? (hasPathTenant ? `/${possibleTenant}/pay/admission-fees/${applicantId}` : `/pay/admission-fees/${applicantId}`)
      : (hasPathTenant ? `/${possibleTenant}/pay/admission-fees` : `/pay/admission-fees`);

    const redirectUrl = new URL(targetPath, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Legacy admission payment API compatibility rewrite: /api/.../admissions/payment -> /api/.../pay/admission-fees
  const apiAdmissionPaymentMatch = pathname.match(/^(?:\/api\/([^/]+)|\/api)\/admissions\/payment\/?$/i);
  if (apiAdmissionPaymentMatch) {
    const pathTenant = apiAdmissionPaymentMatch[1];
    const resolvedTenant = pathTenant || tenantDomain || request.cookies.get('x-website-domain')?.value;
    if (resolvedTenant) {
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = `/api/${resolvedTenant}/pay/admission-fees`;
      return NextResponse.rewrite(targetUrl);
    }
  }

  // ============================================================================
  // CASE 1: MAIN SAAS WEBSITE (base_url or localhost)
  // ============================================================================
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
                } else if (!PLATFORM_RESERVED.has(first)) {
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
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const first = pathParts[0].toLowerCase();
      if (!PLATFORM_RESERVED.has(first)) {
        const response = NextResponse.next();
        response.cookies.set('x-website-domain', first, { path: '/' });
        return response;
      }
    }

    // 1D: Workstation panel access on base domain with active tenant cookie
    const activeTenantCookie =
      request.cookies.get('x-website-domain')?.value ||
      request.cookies.get('x-domain')?.value;

    if (
      activeTenantCookie &&
      (pathname === '/staff-panel' || pathname.startsWith('/staff-panel/') ||
       pathname === '/student' || pathname.startsWith('/student/') ||
       pathname === '/student-verify' || pathname.startsWith('/student-verify/') ||
       pathname === '/teacher' || pathname.startsWith('/teacher/') ||
       pathname === '/officer' || pathname.startsWith('/officer/') ||
       pathname === '/officer-panel' || pathname.startsWith('/officer-panel/'))
    ) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-website-domain', activeTenantCookie);
      requestHeaders.set('x-domain', activeTenantCookie);
      const targetPath = pathname.startsWith('/officer-panel')
        ? pathname.replace('/officer-panel', '/officer')
        : (pathname.startsWith('/student-verify') ? `/staff-panel/student-verify` : pathname);
      url.pathname = `/${activeTenantCookie}${targetPath}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    // Directly use main website for all main platform routes!
    return NextResponse.next();
  }

  // ============================================================================
  // CASE 2: TENANT WEBSITE (subdomain.base_url or custom domain)
  // ============================================================================
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-website-domain', tenantDomain);
  requestHeaders.set('x-domain', tenantDomain);

  // 2A: Handle API routes for tenant
  if (pathname.startsWith('/api')) {
    // Allow creator/marketing/developer platform APIs to pass through if requested
    if (pathname.startsWith('/api/marketing') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/seed')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // If already scoped to tenant API (e.g. /api/[domain]/...)
    if (pathname === `/api/${tenantDomain}` || pathname.startsWith(`/api/${tenantDomain}/`)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Rewrite /api/... to /api/[domain]/... (e.g. /api/classes -> /api/afit/classes)
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

  // Officer panel path alias normalization
  if (pathname === '/officer-panel' || pathname.startsWith('/officer-panel/')) {
    const targetPath = pathname.replace('/officer-panel', '/officer');
    url.pathname = `/${tenantDomain}${targetPath}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Student verify path alias normalization
  if (pathname === '/student-verify' || pathname.startsWith('/student-verify/')) {
    url.pathname = `/${tenantDomain}/staff-panel/student-verify`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Rewrite root or internal path to /[domain] (e.g. / -> /afit, /about -> /afit/about, /staff-panel -> /afit/staff-panel)
  url.pathname = `/${tenantDomain}${pathname === '/' ? '' : pathname}`;
  const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  response.cookies.set('x-website-domain', tenantDomain, { path: '/' });
  return response;
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)',
  ],
};

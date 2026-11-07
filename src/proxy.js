import { NextResponse } from 'next/server.js';
import {
  BASE_URL,
  BASE_DOMAIN,
  BASE_HOST,
  getBaseUrl,
  getWebsiteDomain,
} from './lib/database/secret.js';

export { getWebsiteDomain };

export function proxy(request) {
  const url = typeof request.nextUrl?.clone === 'function'
    ? request.nextUrl.clone()
    : new URL(request.url || 'http://localhost');
  const pathname = url.pathname;

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

  const tenantDomain = getWebsiteDomain(request);

  const PLATFORM_RESERVED = new Set([
    'creator', 'developer', 'developer-auth', 'developers', 'api', '_next',
    'marketing', 'auth', 'admin', 'icon.png', 'favicon.ico', 'robots.txt',
    'sitemap.xml', 'about', 'blogs', 'careers', 'contact', 'faqs', 'packages',
    'policies', 'reviews', 'tutorials', 'updates', 'help', 'terms', 'privacy',
    'login', 'register'
  ]);

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

  if (!tenantDomain) {
    const legacyMatch = pathname.match(/^\/(?:websites|website|webite)\/([^/?#]+)(.*)$/i);
    if (legacyMatch) {
      const domain = legacyMatch[1];
      const rest = legacyMatch[2] || '';
      url.pathname = `/${domain}${rest}`;
      const response = NextResponse.rewrite(url);
      response.cookies.set('x-website-domain', domain, { path: '/' });
      return response;
    }

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

    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const first = pathParts[0].toLowerCase();
      if (!PLATFORM_RESERVED.has(first)) {
        const response = NextResponse.next();
        response.cookies.set('x-website-domain', first, { path: '/' });
        return response;
      }
    }

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

    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-website-domain', tenantDomain);
  requestHeaders.set('x-domain', tenantDomain);

  if (pathname.startsWith('/api')) {
    if (pathname.startsWith('/api/marketing') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/seed')) {
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

  if (pathname === '/officer-panel' || pathname.startsWith('/officer-panel/')) {
    const targetPath = pathname.replace('/officer-panel', '/officer');
    url.pathname = `/${tenantDomain}${targetPath}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  if (pathname === '/student-verify' || pathname.startsWith('/student-verify/')) {
    url.pathname = `/${tenantDomain}/staff-panel/student-verify`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

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

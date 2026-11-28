import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  BASE_URL,
  BASE_DOMAIN,
  BASE_HOST,
  getBaseUrl,
  getWebsiteDomain,
  CREATOR_TOKEN,
  JWT_SECRET,
} from './lib/database/secret';

export { getWebsiteDomain };

const DEFAULT_JWT_SECRET = JWT_SECRET || 'creator_jwt_secret_key_2026';

function getLoggedInCreatorId(request: any): number | null {
  const token = request.cookies?.get?.(CREATOR_TOKEN)?.value;
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const [headerB64, payloadB64, signature] = parts;
    let valid = false;
    try {
      const expectedSig = crypto
        .createHmac('sha256', DEFAULT_JWT_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');
      valid = expectedSig === signature;
    } catch {}

    if (!valid) {
      try {
        const expectedSig = crypto
          .createHmac('sha256', DEFAULT_JWT_SECRET)
          .update(`${headerB64}.${payloadB64}`)
          .digest('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
        valid = expectedSig === signature;
      } catch {}
    }

    if (!valid) return null;

    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (!payload || !payload.id) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return Number(payload.id);
  } catch {
    return null;
  }
}

export function proxy(request: any) {
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
  const loggedInCreatorId = getLoggedInCreatorId(request);
  const primaryBase = getBaseUrl(request);

  if (loggedInCreatorId !== null && !pathname.startsWith('/api')) {
    const isCreatorAuthPath =
      pathname === '/creator/login' || pathname.startsWith('/creator/login/') ||
      pathname === '/creator/register' || pathname.startsWith('/creator/register/') ||
      pathname === '/creator/recovery' || pathname.startsWith('/creator/recovery/') ||
      pathname === '/creator/verify' || pathname.startsWith('/creator/verify/') ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/recovery' ||
      pathname === '/verify';

    const creatorIdMatch = pathname.match(/^\/creator\/([^/]+)/);
    const isOtherCreatorWorkspace =
      creatorIdMatch &&
      creatorIdMatch[1] !== 'checkout' &&
      creatorIdMatch[1] !== String(loggedInCreatorId) &&
      !['login', 'register', 'recovery', 'verify'].includes(creatorIdMatch[1]);

    if (isCreatorAuthPath || isOtherCreatorWorkspace) {
      const destUrl = new URL(`/creator/${loggedInCreatorId}`, primaryBase);
      return NextResponse.redirect(destUrl);
    }
  }

  if (pathname === '/login') {
    const dest = new URL('/creator/login', request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest);
  }
  if (pathname === '/register') {
    const dest = new URL('/creator/register', request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest);
  }
  if (pathname === '/recovery') {
    const dest = new URL('/creator/recovery', request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest);
  }
  if (pathname === '/verify') {
    const dest = new URL('/creator/verify', request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest);
  }

  if (!loggedInCreatorId && pathname.startsWith('/creator/')) {
    const publicCreatorPaths = ['/creator/login', '/creator/register', '/creator/recovery', '/creator/verify', '/creator/checkout'];
    const isPublicCreatorPath = publicCreatorPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if (!isPublicCreatorPath) {
      const dest = new URL('/creator/login', request.url);
      dest.searchParams.set('redirect', pathname);
      return NextResponse.redirect(dest);
    }
  }

  const PLATFORM_RESERVED = new Set([
    'creator', 'developer', 'developer-auth', 'developers', 'api', '_next',
    'marketing', 'auth', 'admin', 'icon.png', 'favicon.ico', 'robots.txt',
    'sitemap.xml', 'about', 'blogs', 'careers', 'contact', 'faqs', 'packages',
    'policies', 'reviews', 'tutorials', 'updates', 'help', 'terms', 'privacy',
    'login', 'register', 'payment'
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

    const KNOWN_TENANT_API_SEGMENTS = new Set([
      'abouts', 'admissions', 'announcements', 'authorities', 'awards', 'board-members',
      'campus-data', 'class-subject-teachers', 'class-subjects', 'classes', 'club-news',
      'clubs', 'collaborations', 'contact', 'departments', 'designations', 'events',
      'exams', 'facilities', 'faqs', 'fees', 'gallery', 'histories', 'home', 'hostels',
      'infrastructure', 'institutional', 'library', 'milestones', 'missions', 'modules',
      'news', 'notices', 'officer', 'pay', 'policies', 'public', 'staff', 'stats',
      'student', 'teacher', 'teachers', 'visions', 'website-settings'
    ]);

    if (pathname.startsWith('/api')) {
      if (!pathname.startsWith('/api/marketing') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/payment') && !pathname.startsWith('/api/seed')) {
        const apiParts = pathname.split('/').filter(Boolean);
        if (
          apiParts.length >= 3 &&
          KNOWN_TENANT_API_SEGMENTS.has(apiParts[2].toLowerCase()) &&
          !KNOWN_TENANT_API_SEGMENTS.has(apiParts[1].toLowerCase()) &&
          !PLATFORM_RESERVED.has(apiParts[1].toLowerCase())
        ) {
          const explicitHeaders = new Headers(request.headers);
          explicitHeaders.set('x-website-domain', apiParts[1]);
          explicitHeaders.set('x-domain', apiParts[1]);
          return NextResponse.next({ request: { headers: explicitHeaders } });
        }

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
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-website-domain', first);
        requestHeaders.set('x-domain', first);
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        response.cookies.set('x-website-domain', first, { path: '/' });
        return response;
      }
    }

    const activeTenantCookie =
      request.cookies.get('x-website-domain')?.value ||
      request.cookies.get('x-domain')?.value;

    let candidateTenant =
      activeTenantCookie ||
      request.cookies.get('website_slug')?.value;

    if (!candidateTenant) {
      const referer = request.headers.get('referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          const first = refUrl.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
          if (first && !PLATFORM_RESERVED.has(first)) {
            candidateTenant = first;
          }
        } catch {}
      }
    }

    if (
      candidateTenant &&
      (pathname === '/staff-panel' || pathname.startsWith('/staff-panel/') ||
       pathname === '/student' || pathname.startsWith('/student/') ||
       pathname === '/student-verify' || pathname.startsWith('/student-verify/') ||
       pathname === '/teacher' || pathname.startsWith('/teacher/') ||
       pathname === '/officer' || pathname.startsWith('/officer/') ||
       pathname === '/officer-panel' || pathname.startsWith('/officer-panel/') ||
       pathname === '/auth' || pathname.startsWith('/auth/'))
    ) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-website-domain', candidateTenant);
      requestHeaders.set('x-domain', candidateTenant);
      const targetPath = pathname.startsWith('/officer-panel')
        ? pathname.replace('/officer-panel', '/officer')
        : (pathname.startsWith('/student-verify') ? `/staff-panel/student-verify` : pathname);
      url.pathname = `/${candidateTenant}${targetPath}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-website-domain', tenantDomain);
  requestHeaders.set('x-domain', tenantDomain);

  if (pathname.startsWith('/api')) {
    if (pathname.startsWith('/api/marketing') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/payment') || pathname.startsWith('/api/seed')) {
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

/**
 * Multi-Tenant URL Builder for Student Onboarding, Verification, and Recovery.
 * Resolves custom domain if set, otherwise subdomain.baseDomain (or subdomain.localhost:port in dev).
 */

export function getTenantBaseOrigin(website, request) {
  const reqHost = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host') || '';
  const baseHost = (reqHost ? reqHost.split(',')[0].trim() : '') || 'localhost:3000';
  const protocol = request?.headers?.get?.('x-forwarded-proto') || (baseHost.includes('localhost') ? 'http' : 'https');

  // 1. Custom domain (if configured)
  const rawCustom = (website?.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (rawCustom) {
    const customProto = rawCustom.includes('localhost') ? 'http' : 'https';
    return `${customProto}://${rawCustom}`;
  }

  // 2. Subdomain of platform base URL
  const rawSub = (website?.subdomain || website?.slug || '').trim().toLowerCase();
  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

  if (baseHost.includes('localhost')) {
    const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';
    return `${protocol}://${cleanSub}.localhost${port}`;
  }

  const cleanHostNoPort = baseHost.split(':')[0];
  const parts = cleanHostNoPort.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : cleanHostNoPort;
  const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';

  return `${protocol}://${cleanSub}.${baseDomain}${port}`;
}

export function buildStudentSetupUrl(website, token, request) {
  const origin = getTenantBaseOrigin(website, request);
  return `${origin}/auth/student/setup?token=${encodeURIComponent(token)}`;
}

export function buildStudentRecoveryUrl(website, token, request) {
  const origin = getTenantBaseOrigin(website, request);
  return `${origin}/auth/student/recovery?token=${encodeURIComponent(token)}`;
}

export function buildStudentPortalUrl(website, request) {
  const origin = getTenantBaseOrigin(website, request);
  return `${origin}/student`;
}

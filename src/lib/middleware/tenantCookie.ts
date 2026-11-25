import { getTenantTokenKey, resolveTenantDomainIdentifier } from '../database/secret';

export async function getHeaderStore() {
  try {
    const nextHeaders = await import('next/headers');
    if (nextHeaders && typeof nextHeaders.headers === 'function') {
      return await nextHeaders.headers();
    }
  } catch {}
  return null;
}

export async function getCookieStore() {
  try {
    const nextHeaders = await import('next/headers');
    if (nextHeaders && typeof nextHeaders.cookies === 'function') {
      return await nextHeaders.cookies();
    }
  } catch {}
  return null;
}

export async function resolveTenantCookieName(
  role: 'teacher' | 'staff' | 'officer' | 'student',
  requestOrDomain?: any,
  explicitDomain?: string | null
): Promise<string> {
  const direct = resolveTenantDomainIdentifier(requestOrDomain, explicitDomain);
  if (direct) {
    return `${direct}-${role}`;
  }

  const [headerStore, cookieStore] = await Promise.all([getHeaderStore(), getCookieStore()]);
  const resolved = resolveTenantDomainIdentifier({
    headers: headerStore,
    cookies: cookieStore,
  });

  return resolved ? `${resolved}-${role}` : getTenantTokenKey(role);
}

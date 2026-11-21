import { getWebsiteUrl } from '../database/secret';

export function getTenantBaseOrigin(website: any, request?: any): string {
  return getWebsiteUrl(website, request);
}

export function buildStudentSetupUrl(website: any, token?: string | null, request?: any, email?: string): string {
  const origin = getTenantBaseOrigin(website, request);
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (email) params.set('email', email);
  const q = params.toString();
  return `${origin}/auth/student/setup${q ? `?${q}` : ''}`;
}

export function buildStudentRecoveryUrl(website: any, token: string, request?: any): string {
  const origin = getTenantBaseOrigin(website, request);
  return `${origin}/auth/student/recovery?token=${encodeURIComponent(token)}`;
}

export function buildStudentPortalUrl(website: any, request?: any): string {
  const origin = getTenantBaseOrigin(website, request);
  return `${origin}/student`;
}

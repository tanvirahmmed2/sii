import { getWebsiteUrl } from '../database/secret.js';

export function getTenantBaseOrigin(website, request) {
  return getWebsiteUrl(website, request);
}

export function buildStudentSetupUrl(website, token, request, email) {
  const origin = getTenantBaseOrigin(website, request);
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (email) params.set('email', email);
  const q = params.toString();
  return `${origin}/auth/student/setup${q ? `?${q}` : ''}`;
}

export function buildStudentRecoveryUrl(website, token, request) {
  const origin = getTenantBaseOrigin(website, request);
  return `${origin}/auth/student/recovery?token=${encodeURIComponent(token)}`;
}

export function buildStudentPortalUrl(website, request) {
  const origin = getTenantBaseOrigin(website, request);
  return `${origin}/student`;
}

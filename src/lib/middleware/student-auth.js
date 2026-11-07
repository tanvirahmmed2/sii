import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from './websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from './staff.js';

export async function verifyStudentStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  const hasAllowance = await hasTenantModuleAllowance(website, 'sis');
  if (!hasAllowance) {
    return {
      error: "The 'sis' (Student Information System) module is not included in this institution's subscription plan.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401, code: 'UNAUTHORIZED' };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403, code: 'FORBIDDEN_CROSS_TENANT' };
  }

  const hasStudentPerm =
    hasStaffModulePermission(staffSession, 'sis', action) ||
    hasStaffModulePermission(staffSession, 'student-management', action) ||
    hasStaffModulePermission(staffSession, 'student', action);

  if (!hasStudentPerm) {
    return {
      error: `Forbidden: Insufficient privileges to ${action} student records.`,
      status: 403,
      code: 'PERMISSION_DENIED',
      website,
      staffSession,
    };
  }

  return {
    website,
    staffSession,
    staff: staffSession.staff || staffSession.user,
    allowed: true,
  };
}

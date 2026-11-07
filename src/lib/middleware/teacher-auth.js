import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from './websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from './staff.js';

export async function verifyTeacherStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  const hasAllowance =
    (await hasTenantModuleAllowance(website, 'routine')) ||
    (await hasTenantModuleAllowance(website, 'sis')) ||
    (await hasTenantModuleAllowance(website, 'staff-payroll'));

  if (!hasAllowance) {
    return {
      error: "The required module ('routine', 'sis', or 'staff-payroll') is not included in this institution's subscription plan.",
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

  if (staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403, code: 'FORBIDDEN_CROSS_TENANT' };
  }

  const hasStaffPerm =
    hasStaffModulePermission(staffSession, 'routine', action) ||
    hasStaffModulePermission(staffSession, 'staff-payroll', action) ||
    hasStaffModulePermission(staffSession, 'sis', action);

  if (!hasStaffPerm) {
    return {
      error: `Forbidden: Insufficient privileges to ${action} teacher records.`,
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

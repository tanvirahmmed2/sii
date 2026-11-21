import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from './websiteResolver';
import { getStaffSession, hasStaffModulePermission } from './staff';
import { getCreatorSession } from './creator';

export async function verifyTeacherStaffAccess(request: any, context?: any, action = 'view'): Promise<any> {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  const creatorSession = await getCreatorSession(request);
  if (creatorSession && (String(creatorSession.id) === String(website.creator_id) || creatorSession.isDeveloper)) {
    return {
      website,
      isCreator: true,
      allowed: true,
    };
  }

  const hasAllowance =
    (await hasTenantModuleAllowance(website, 'routine')) ||
    (await hasTenantModuleAllowance(website, 'sis')) ||
    (await hasTenantModuleAllowance(website, 'staff-payroll')) ||
    (await hasTenantModuleAllowance(website, 'teachers')) ||
    (await hasTenantModuleAllowance(website, 'teacher-management')) ||
    (await hasTenantModuleAllowance(website, 'all'));

  if (!hasAllowance) {
    return {
      error: "The required module is not included in this institution's subscription plan.",
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
    hasStaffModulePermission(staffSession, 'sis', action) ||
    hasStaffModulePermission(staffSession, 'teachers', action) ||
    hasStaffModulePermission(staffSession, 'teacher-management', action) ||
    hasStaffModulePermission(staffSession, 'all', action);

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

import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from './websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from './staff.js';

/**
 * Verifies staff authentication and permission for student operations.
 * Enforces:
 * 1. Tenant website has the 'sis' module in its subscription package
 * 2. Authenticated staff belongs to this tenant website
 * 3. Staff member has explicit permission for the requested action on 'sis'
 */
export async function verifyStudentStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  // 1. Check Tenant Subscription Package Allowance
  const hasAllowance = await hasTenantModuleAllowance(website, 'sis');
  if (!hasAllowance) {
    return {
      error: "The 'sis' (Student Information System) module is not included in this institution's subscription plan.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  // 2. Check Staff Session & Tenant Boundary
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

  // 3. Check Staff Module Permissions
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

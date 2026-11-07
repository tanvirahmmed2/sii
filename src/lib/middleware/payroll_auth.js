import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';

export async function verifyPayrollStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  const hasAllowance = (await hasTenantModuleAllowance(website, 'staff-payroll')) ||
    (action === 'view' && await hasTenantModuleAllowance(website, 'teacher-management'));
  if (!hasAllowance) {
    return {
      error: "The 'staff-payroll' module is not included in this institution's subscription plan.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401, code: 'UNAUTHORIZED' };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403, code: 'FORBIDDEN_CROSS_TENANT' };
  }

  const hasStaffPayroll = hasStaffModulePermission(staffSession, 'staff-payroll', action);
  const hasTeacherManagement = action === 'view' && (
    hasStaffModulePermission(staffSession, 'teacher-management', 'view') ||
    hasStaffModulePermission(staffSession, 'teacher-management', 'create') ||
    hasStaffModulePermission(staffSession, 'teacher-management', 'edit')
  );

  if (!hasStaffPayroll && !hasTeacherManagement) {
    return {
      error: `Forbidden: Insufficient privileges to ${action} payroll and salary records.`,
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

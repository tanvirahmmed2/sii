import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';

/**
 * Validates staff authorization to access and manage teacher and officer payroll, salary, and payment records.
 * Enforces:
 * 1. Tenant website has 'staff-payroll' included in subscription plan
 * 2. Authenticated staff member belongs to this tenant website
 * 3. Staff member has explicit permission for the requested action on 'staff-payroll'
 */
export async function verifyPayrollStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  // 1. Check Tenant Subscription Package Allowance
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

  // 2. Check Staff Session & Tenant Boundary
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

  // 3. Check Staff Module Permissions
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

import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession, hasStaffModulePermission, isGeneralStaff } from 'src/lib/middleware/staff.js';

/**
 * Validates staff authorization to access and manage teacher and officer payroll, salary, and payment records.
 */
export async function verifyPayrollStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const staffSession = await getStaffSession(request);

  if (!staffSession) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  const hasStaffPayroll = hasStaffModulePermission(staffSession, 'staff-payroll', action);
  const hasSis = hasStaffModulePermission(staffSession, 'sis', action);
  const generalStaff = await isGeneralStaff(request);

  if (!hasStaffPayroll && !hasSis && !generalStaff) {
    return { error: `Forbidden: Insufficient privileges to ${action} payroll and salary records.`, status: 403 };
  }

  return { website, staffSession, allowed: true };
}

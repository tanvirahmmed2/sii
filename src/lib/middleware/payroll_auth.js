import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession, hasStaffModulePermission, isGeneralStaff } from 'src/lib/middleware/staff.js';
import { isAdmin } from 'src/lib/middleware/developer.js';

/**
 * Validates staff authorization to access and manage teacher and officer payroll, salary, and payment records.
 */
export async function verifyPayrollStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (!devAdmin && staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  if (devAdmin) {
    return { website, staffSession, devAdmin, allowed: true };
  }

  const hasStaffPayroll = hasStaffModulePermission(staffSession, 'staff-payroll', action);
  const hasSis = hasStaffModulePermission(staffSession, 'sis', action);
  const generalStaff = await isGeneralStaff(request);

  if (!hasStaffPayroll && !hasSis && !generalStaff) {
    return { error: `Forbidden: Insufficient privileges to ${action} payroll and salary records.`, status: 403 };
  }

  return { website, staffSession, devAdmin, allowed: true };
}

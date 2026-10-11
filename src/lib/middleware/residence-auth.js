import { resolveWebsiteFromRequest } from './creator.js';
import { getStaffSession, hasStaffModulePermission, isGeneralStaff } from './staff.js';

/**
 * Verifies staff authentication and permission for residence/hall operations.
 * Allowed:
 * 1. Staff with 'residence', 'hall', or 'hostel' module permissions
 * 2. Authenticated active staff members with general access
 */
export async function verifyResidenceStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const staffSession = await getStaffSession(request);

  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  const hasResidenceModule =
    hasStaffModulePermission(staffSession, 'residence', action) ||
    hasStaffModulePermission(staffSession, 'hall', action) ||
    hasStaffModulePermission(staffSession, 'hostel', action);
  const generalStaff = await isGeneralStaff(request);

  if (!hasResidenceModule && !generalStaff) {
    return { error: `Forbidden: Insufficient privileges to ${action} residence/hall records.`, status: 403 };
  }

  return { website, staffSession, allowed: true };
}

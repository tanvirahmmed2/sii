import { resolveWebsiteFromRequest } from './creator.js';
import { getStaffSession, hasStaffModulePermission, isGeneralStaff } from './staff.js';
import { isAdmin } from './developer.js';

/**
 * Verifies staff authentication and permission for residence/hall operations.
 * Allowed:
 * 1. Developer Admin (full privileges)
 * 2. Staff with 'residence', 'hall', or 'hostel' module permissions
 * 3. Authenticated active staff members with general access
 */
export async function verifyResidenceStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
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

  const hasResidenceModule =
    hasStaffModulePermission(staffSession, 'residence', action) ||
    hasStaffModulePermission(staffSession, 'hall', action) ||
    hasStaffModulePermission(staffSession, 'hostel', action);
  const generalStaff = await isGeneralStaff(request);

  if (!hasResidenceModule && !generalStaff) {
    return { error: `Forbidden: Insufficient privileges to ${action} residence/hall records.`, status: 403 };
  }

  return { website, staffSession, devAdmin, allowed: true };
}

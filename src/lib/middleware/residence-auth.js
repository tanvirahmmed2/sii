import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from './websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from './staff.js';

/**
 * Verifies staff authentication and permission for residence/hall operations.
 * Requires:
 * 1. Tenant website subscription package must include 'hostel' module
 * 2. Authenticated staff member belonging to this tenant
 * 3. Staff member has explicit permission for 'hostel' or 'residence' module
 */
export async function verifyResidenceStaffAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  // 1. Check Tenant Subscription Module Allowance
  const hasAllowance = await hasTenantModuleAllowance(website, 'hostel') || await hasTenantModuleAllowance(website, 'residence');
  if (!hasAllowance) {
    return {
      error: "The Residence & Hostel module is not included in this institution's subscription plan. Please upgrade your package.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
    };
  }

  // 2. Check Staff Session
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

  // 3. Check Staff Granular Permission
  const hasResidencePerm =
    hasStaffModulePermission(staffSession, 'hostel', action) ||
    hasStaffModulePermission(staffSession, 'residence', action) ||
    hasStaffModulePermission(staffSession, 'hall', action);

  if (!hasResidencePerm) {
    return { error: `Forbidden: Insufficient privileges to ${action} residence/hall records.`, status: 403 };
  }

  return { website, staffSession, allowed: true };
}

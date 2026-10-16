import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';
import { getOfficerSession } from 'src/lib/middleware/officer.js';

/**
 * Validates whether the incoming request is authorized to manage education fees, batch dues, and student payment collections.
 * 
 * Strict Tenant Boundary: Checks tenant subscription allowance and module permissions.
 *
 * @param {Request} request
 * @param {Object} context
 * @param {'view'|'create'|'edit'|'delete'} action
 * @returns {Promise<{ website: Object, actor: Object, staffSession?: Object, officerSession?: Object, allowed: boolean } | { error: string, status: number }>}
 */
export async function verifyEducationFeeAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  // Check tenant module allowance
  const hasAllowance = (await hasTenantModuleAllowance(website, 'fees')) || (await hasTenantModuleAllowance(website, 'accounting'));
  if (!hasAllowance) {
    return {
      error: "The 'fees' / 'accounting' module is not included in this institution's subscription plan.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  // 1. Check Staff Session
  const staffSession = await getStaffSession(request);
  if (staffSession) {
    const staffWebsiteId =
      staffSession?.website_id ||
      staffSession?.websiteId ||
      staffSession?.staff?.websiteId ||
      staffSession?.staff?.website_id;

    if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403, code: 'FORBIDDEN_CROSS_TENANT' };
    }

    const hasFeePerm =
      hasStaffModulePermission(staffSession, 'fees', action) ||
      hasStaffModulePermission(staffSession, 'fee', action) ||
      hasStaffModulePermission(staffSession, 'education-fee', action) ||
      hasStaffModulePermission(staffSession, 'fees-education', action) ||
      hasStaffModulePermission(staffSession, 'accounts', action) ||
      hasStaffModulePermission(staffSession, 'accounting', action);

    if (hasFeePerm) {
      const staffUser = staffSession.staff || staffSession.user || staffSession;
      return {
        website,
        actor: {
          type: 'staff',
          id: staffUser?.id || staffSession?.id,
          name: staffUser?.name || 'Staff Member',
          email: staffUser?.email || null,
          role: staffSession?.role || 'staff'
        },
        staffSession,
        allowed: true
      };
    }
  }

  // 2. Check Officer Session
  const officerSession = await getOfficerSession(request);
  if (officerSession && officerSession.officer) {
    const officer = officerSession.officer;
    if (officer.website_id && String(officer.website_id) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
    }

    const dept = (officer.department || '').toLowerCase();
    const isAccountsOrAdmin =
      dept.includes('account') ||
      dept.includes('finance') ||
      dept.includes('admin') ||
      dept.includes('academic') ||
      dept.includes('general');

    if (isAccountsOrAdmin) {
      return {
        website,
        actor: {
          type: 'officer',
          id: officer.id,
          name: officer.name || 'Officer',
          email: officer.email,
          designation: officer.designation,
          department: officer.department
        },
        officerSession,
        allowed: true
      };
    }
  }

  return {
    error: `Forbidden: Insufficient privileges to ${action} education fees or payments. Staff or officer role required.`,
    status: staffSession || officerSession ? 403 : 401
  };
}

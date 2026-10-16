import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';
import { getOfficerSession, hasOfficerModulePermission } from 'src/lib/middleware/officer.js';

/**
 * Validates whether the incoming request is authorized to manage exams and academic candidate operations.
 * Requires:
 *  1. Tenant website subscription package must include 'exams' module
 *  2. Authenticated Staff with 'exams' permission, OR Officer with 'exams' permission
 *
 * @param {Request} request
 * @param {Object} context
 * @param {'view'|'create'|'edit'|'delete'} action
 * @returns {Promise<{ website: Object, actor: Object, allowed: boolean } | { error: string, status: number }>}
 */
export async function verifyExamAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  // 1. Check Tenant Subscription Package Module Allowance
  const hasAllowance = await hasTenantModuleAllowance(website, 'exams');
  if (!hasAllowance) {
    return {
      error: "The Examinations & Report Cards module is not included in this institution's current subscription plan. Please upgrade your package.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
    };
  }

  // 2. Check Staff Session
  const staffSession = await getStaffSession(request);
  if (staffSession) {
    const staffWebsiteId =
      staffSession?.website_id ||
      staffSession?.websiteId ||
      staffSession?.staff?.websiteId ||
      staffSession?.staff?.website_id;

    if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
    }

    const hasExamPerm =
      hasStaffModulePermission(staffSession, 'exams', action) ||
      hasStaffModulePermission(staffSession, 'exam', action) ||
      hasStaffModulePermission(staffSession, 'examination', action);

    if (hasExamPerm) {
      const staffUser = staffSession.staff || staffSession.user || staffSession;
      return {
        website,
        actor: {
          type: 'staff',
          id: staffUser?.id || staffSession?.id,
          name: staffUser?.name || 'Staff Member',
          email: staffUser?.email || null,
          role: staffSession?.role || 'staff',
        },
        allowed: true,
      };
    }

    return {
      error: `Forbidden: You do not have permission to ${action} examination records.`,
      status: 403,
      code: 'PERMISSION_DENIED',
    };
  }

  // 3. Check Officer Session
  const officerSession = await getOfficerSession(request);
  if (officerSession) {
    const officerWebsiteId =
      officerSession?.website_id ||
      officerSession?.websiteId ||
      officerSession?.officer?.websiteId ||
      officerSession?.officer?.website_id;

    if (officerWebsiteId && String(officerWebsiteId) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
    }

    const officer = officerSession.officer || officerSession.user || officerSession;
    const dept = (officer?.department || officer?.designation || '').toLowerCase();
    const isExamDept = dept.includes('exam') || dept.includes('academic') || dept.includes('controller') || dept.includes('registrar');
    const hasOfficerPerm =
      hasOfficerModulePermission(officerSession, 'exams', action) ||
      hasOfficerModulePermission(officerSession, 'exam', action) ||
      isExamDept;

    if (hasOfficerPerm) {
      return {
        website,
        actor: {
          type: 'officer',
          id: officer?.id || officerSession?.id,
          name: officer?.name || 'Officer',
          email: officer?.email || null,
          department: officer?.department || null,
        },
        allowed: true,
      };
    }

    return {
      error: `Forbidden: Officer does not have permission to ${action} examination records.`,
      status: 403,
      code: 'PERMISSION_DENIED',
    };
  }

  return {
    error: 'Unauthorized: Staff or Officer examination credentials required.',
    status: 401,
  };
}

export default verifyExamAccess;

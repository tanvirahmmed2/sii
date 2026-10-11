import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession, hasStaffModulePermission, isGeneralStaff } from 'src/lib/middleware/staff.js';
import { getOfficerSession } from 'src/lib/middleware/officer.js';

/**
 * Validates whether the incoming request is authorized to manage exams and academic candidate operations.
 * Allows:
 *  1. Allowed Staff (General staff or staff with exam/sis/academic module permission)
 *  2. Allowed Officers (Officers in Exam/Academic department or with exam module permissions)
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

  // 1. Check Staff Session
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

    const generalStaff = await isGeneralStaff(request);
    const hasExamPerm =
      hasStaffModulePermission(staffSession, 'exam', action) ||
      hasStaffModulePermission(staffSession, 'exams', action) ||
      hasStaffModulePermission(staffSession, 'exam-list', action) ||
      hasStaffModulePermission(staffSession, 'examination', action) ||
      hasStaffModulePermission(staffSession, 'sis', action);

    if (generalStaff || hasExamPerm) {
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
        allowed: true
      };
    }
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

    if (isExamDept || officer?.is_admin || officer?.can_manage_exams) {
      return {
        website,
        actor: {
          type: 'officer',
          id: officer?.id || officerSession?.id,
          name: officer?.name || 'Officer',
          email: officer?.email || null,
          department: officer?.department || null
        },
        allowed: true
      };
    }
  }

  return {
    error: 'Unauthorized: Insufficient examination management permissions.',
    status: 403
  };
}

import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission } from 'src/lib/middleware/staff.js';
import { getOfficerSession } from 'src/lib/middleware/officer.js';

export async function verifyLibraryAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const hasAllowance = await hasTenantModuleAllowance(website, 'library');
  if (!hasAllowance) {
    return {
      error: "The Library Management module is not included in this institution's current subscription plan. Please upgrade your package.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
    };
  }

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

    const hasLibraryPerm =
      hasStaffModulePermission(staffSession, 'library', action) ||
      hasStaffModulePermission(staffSession, 'management-library', action);

    if (hasLibraryPerm) {
      const staffUser = staffSession.staff || staffSession.user || staffSession;
      return {
        website,
        actor: {
          type: 'staff',
          id: staffUser.id || staffUser.staff_id || null,
          name: staffUser.name || staffUser.full_name || 'Staff Member',
          email: staffUser.email || null
        },
        allowed: true
      };
    }

    return {
      error: `Forbidden: You do not have permission to ${action} library records.`,
      status: 403,
      code: 'PERMISSION_DENIED',
    };
  }

  const officerSession = await getOfficerSession(request);
  if (officerSession) {
    if (officerSession.website_id && String(officerSession.website_id) !== String(website.id)) {
      return { error: 'Forbidden: Cross-tenant officer access denied.', status: 403 };
    }

    const isLibraryDept = String(officerSession.department || '').toLowerCase() === 'library';
    const officerPerms = officerSession.permissions || {};
    const libraryPerm = officerPerms['library'] || officerPerms['management-library'];

    let hasActionPerm = isLibraryDept;
    if (!hasActionPerm && libraryPerm) {
      if (action === 'view') hasActionPerm = Boolean(libraryPerm.can_view);
      else if (action === 'create') hasActionPerm = Boolean(libraryPerm.can_create);
      else if (action === 'edit') hasActionPerm = Boolean(libraryPerm.can_edit);
      else if (action === 'delete') hasActionPerm = Boolean(libraryPerm.can_delete);
    }

    if (hasActionPerm) {
      return {
        website,
        actor: {
          type: 'officer',
          id: officerSession.id,
          name: officerSession.name || 'Library Officer',
          email: officerSession.email || null
        },
        allowed: true
      };
    }

    return {
      error: `Forbidden: Officer does not have permission to ${action} library records.`,
      status: 403,
      code: 'PERMISSION_DENIED',
    };
  }

  if (!staffSession && !officerSession) {
    return { error: 'Unauthorized: Staff or Officer credentials required.', status: 401 };
  }

  return {
    error: `Forbidden: Insufficient privileges to ${action} library records.`,
    status: 403
  };
}

export default verifyLibraryAccess;

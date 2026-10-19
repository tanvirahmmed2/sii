import { resolveWebsiteFromRequest } from './websiteResolver.js';
import { getStaffSession } from './staff.js';
import { getOfficerSession } from './officer.js';

export async function verifyClubStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  // 1. Staff session
  try {
    const staffSession = await getStaffSession(request);
    if (staffSession) {
      const staffWebsiteId =
        staffSession?.website_id ||
        staffSession?.websiteId ||
        staffSession?.staff?.websiteId ||
        staffSession?.staff?.website_id;

      if (!staffWebsiteId || String(staffWebsiteId) === String(website.id)) {
        return { website, user: staffSession, type: 'staff', allowed: true };
      }
    }
  } catch {}

  // 2. Officer session
  try {
    const officerSession = await getOfficerSession(request);
    if (officerSession) {
      const officerWebsiteId =
        officerSession?.website_id ||
        officerSession?.websiteId ||
        officerSession?.officer?.websiteId ||
        officerSession?.officer?.website_id;

      if (!officerWebsiteId || String(officerWebsiteId) === String(website.id)) {
        return { website, user: officerSession, type: 'officer', allowed: true };
      }
    }
  } catch {}

  return { error: 'Unauthorized: Staff or Officer credentials required.', status: 401, code: 'UNAUTHORIZED' };
}

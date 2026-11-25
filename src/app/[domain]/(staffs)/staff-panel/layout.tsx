import React from 'react';
import { redirect } from 'next/navigation';
import { getStaffSession } from 'src/lib/middleware/staff';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver';
import Navbar from 'src/component/website/bars/admin/Navbar';
import Sidebar from 'src/component/website/bars/admin/Sidebar';
import StaffModuleRouteGuard from 'src/component/staff/StaffModuleRouteGuard';
import { SCHOOL_NAME } from 'src/lib/database/secret';

export const metadata: any = {
  title: 'Staff Administration Panel',
  description: `Institutional management system for campus admissions, academic records, fee accounting, and staff operations at ${SCHOOL_NAME}.`,
};

export const dynamic = 'force-dynamic';

const StaffPanelLayout = async ({ children, params }: any) => {
  const resolvedParams = await params;
  const domain = resolvedParams?.domain;
  const staffSession = await getStaffSession(domain);
  let isCreatorAdmin = false;
  let creatorSession = null;

  if (!staffSession) {
    creatorSession = await getCreatorSession();
    if (creatorSession) {
      const website = await resolveWebsiteFromRequest(null, { params: resolvedParams });
      if (website && (String(creatorSession.id) === String(website.creator_id) || creatorSession.isDeveloper)) {
        isCreatorAdmin = true;
      }
    }
  }

  if (!staffSession && !isCreatorAdmin) {
    const loginTarget = domain ? `/${domain}/auth/access/staff` : '/auth/access/staff';
    redirect(loginTarget);
  }

  const allowedModules = isCreatorAdmin ? ['all'] : (staffSession?.allowedModules || []);
  const staffUser = staffSession?.staff || staffSession?.user || staffSession || (isCreatorAdmin ? {
    id: creatorSession?.id,
    name: creatorSession?.name || 'Administrator',
    email: creatorSession?.email,
    designation: 'Creator / System Owner',
    isActive: true,
  } : null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar staffUser={staffUser} />
      <div className="flex flex-1 pt-14 min-h-[calc(100vh-3.5rem)]">
        <Sidebar allowedModules={allowedModules} isDevAdmin={isCreatorAdmin} />
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-200">
          <StaffModuleRouteGuard allowedModules={allowedModules}>
            {children}
          </StaffModuleRouteGuard>
        </main>
      </div>
    </div>
  );
};

export default StaffPanelLayout;

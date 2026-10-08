import React from 'react';
import { redirect } from 'next/navigation';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';
import Navbar from 'src/component/website/bars/admin/Navbar';
import Sidebar from 'src/component/website/bars/admin/Sidebar';

export const dynamic = 'force-dynamic';

const StaffPanelLayout = async ({ children }) => {
  const staffSession = await getStaffSession();
  const devAdmin = await isAdmin();

  if (!staffSession && !devAdmin) {
    redirect('/auth/access/staff/login');
  }

  const allowedModules = devAdmin ? null : (staffSession?.allowedModules || []);
  const staffUser = staffSession?.staff || (devAdmin ? { name: 'Platform Admin', email: 'admin' } : null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Navbar */}
      <Navbar staffUser={staffUser} />

      <div className="flex flex-1 relative pt-16">
        {/* Left Sidebar */}
        <Sidebar allowedModules={allowedModules} isDevAdmin={devAdmin} />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 p-4 md:p-8 md:pl-[280px] transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StaffPanelLayout;
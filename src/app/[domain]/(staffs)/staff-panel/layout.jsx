import React from 'react';
import { redirect } from 'next/navigation';
import { getStaffSession } from 'src/lib/middleware/staff';
import Navbar from 'src/component/website/bars/admin/Navbar';
import Sidebar from 'src/component/website/bars/admin/Sidebar';

export const dynamic = 'force-dynamic';

const StaffPanelLayout = async ({ children }) => {
  const staffSession = await getStaffSession();

  if (!staffSession) {
    redirect('/auth/access/staff/login');
  }

  const allowedModules = staffSession?.allowedModules || [];
  const staffUser = staffSession?.staff || staffSession?.user || staffSession;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Navbar */}
      <Navbar staffUser={staffUser} />

      <div className="flex flex-1 pt-14 min-h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar */}
        <Sidebar allowedModules={allowedModules} isDevAdmin={false} />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StaffPanelLayout;
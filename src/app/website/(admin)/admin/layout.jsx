import React from 'react';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import Navbar from '@/component/bars/admin/Navbar';
import Sidebar from '@/component/bars/admin/Sidebar';

export const dynamic = 'force-dynamic';

const AdminLayout = async ({ children }) => {
  const authenticated = await isAdmin();

  if (!authenticated) {
    redirect('/auth/access/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex flex-1 relative pt-16">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 p-4 md:p-8 md:pl-[280px] transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
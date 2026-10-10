'use client';

import React, { useState } from 'react';
import OfficerNavbar from './Navbar';
import OfficerSidebar from './Sidebar';

export default function OfficerShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <OfficerNavbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 relative pt-14">
        <OfficerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 md:p-8 transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}

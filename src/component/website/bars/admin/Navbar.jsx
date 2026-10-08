'use client';

import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Link from 'next/link';

const Navbar = ({ staffUser = null }) => {
  const router = useRouter();
  const {
    adminSidebar,
    setAdminSidebar,
    website,
    tenantUrl,
    getApiEndpoint,
    theme,
    isDark,
    toggleTheme,
  } = useContext(TenantWebsiteContext);

  const [staff, setStaff] = useState(staffUser);

  useEffect(() => {
    if (staffUser) return;
    const fetchStaffProfile = async () => {
      try {
        const response = await fetch(getApiEndpoint('staff/me'));
        if (response.ok) {
          const data = await response.json();
          setStaff(data.payload?.staff || data.paylod?.staff || data.staff);
        }
      } catch (error) {
        console.error('Failed to fetch staff profile:', error);
      }
    };
    fetchStaffProfile();
  }, [staffUser, getApiEndpoint]);

  const handleLogout = async () => {
    try {
      const response = await fetch(getApiEndpoint('staff/logout'), {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('Logged out successfully.');
        router.push(tenantUrl('/auth/access/staff/login'));
      } else {
        toast.error('Failed to log out.');
      }
    } catch {
      toast.error('Logout error occurred.');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 z-30 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={() => setAdminSidebar(!adminSidebar)}
          className="px-2 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 md:hidden transition-colors cursor-pointer"
          aria-label="Toggle Navigation"
        >
          Menu
        </button>

        {/* Brand / Title */}
        <div className="flex items-center gap-2">
          <Link href="/staff-panel" className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
              {website?.name ? `${website.name} — Staff Portal` : 'Campus Staff Portal'}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">

        {/* Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? 'Light' : 'Dark'}
        </button>

        {/* Profile Link */}
        <Link
          href="/staff-panel/staff-profile"
          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
        >
          {staff ? staff.name : 'Staff Profile'}
        </Link>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-medium transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
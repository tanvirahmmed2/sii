'use client';

import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function OfficerNavbar({ onToggleSidebar }) {
  const router = useRouter();
  const { website, tenantUrl, getApiEndpoint, isDark, toggleTheme } = useContext(TenantWebsiteContext);
  const [officer, setOfficer] = useState(null);

  useEffect(() => {
    const fetchOfficer = async () => {
      try {
        const res = await fetch(getApiEndpoint('officer/me'));
        if (res.ok) {
          const data = await res.json();
          setOfficer(data.officer || data.payload?.officer);
        }
      } catch (err) {
        console.warn('Failed to fetch officer profile in Navbar:', err);
      }
    };
    fetchOfficer();
  }, [getApiEndpoint]);

  const handleLogout = async () => {
    try {
      const res = await fetch(getApiEndpoint('officer/logout'), { method: 'POST' });
      if (res.ok) {
        toast.success('Logged out successfully.');
        router.refresh();
        router.push(tenantUrl('/auth/access/officer/login'));
      } else {
        toast.error('Logout request failed.');
      }
    } catch {
      toast.error('Logout error occurred.');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 z-30 transition-colors">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="px-2 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 md:hidden transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          Menu
        </button>

        <div className="flex items-center gap-2">
          <Link href={tenantUrl('/officer')} className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
              {website?.name ? `${website.name} — Officer Panel` : 'Officer Operations Desk'}
            </span>
          </Link>
          {officer?.department && (
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-mono">
              {officer.department}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? 'Light' : 'Dark'}
        </button>

        <Link
          href={tenantUrl('/officer/profile')}
          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
        >
          {officer?.name || 'Officer Profile'}
        </Link>

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
}

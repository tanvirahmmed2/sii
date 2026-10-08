'use client';

import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Image from 'next/image';

const Navbar = () => {
  const router = useRouter();
  const { staffSidebar, setStaffSidebar, tenantUrl, getApiEndpoint, website, theme, toggleTheme, language, setLanguage, availableLanguages } = useContext(TenantWebsiteContext);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffProfile = async () => {
      try {
        const response = await fetch(getApiEndpoint('staff/me'));
        if (response.ok) {
          const data = await response.json();
          setStaff(data?.paylod?.staff || data?.payload?.staff || null);
        }
      } catch (error) {
        console.error('Failed to fetch staff profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStaffProfile();
  }, [getApiEndpoint]);

  const handleLogout = async () => {
    try {
      const response = await fetch(getApiEndpoint('staff/logout'), { method: 'POST' });
      if (response.ok) {
        toast.success('Logged out successfully.');
        router.push(tenantUrl('/auth/access/staff/login'));
      } else {
        toast.error('Failed to log out.');
      }
    } catch (error) {
      toast.error('Logout error occurred.');
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'cashier': return 'Cashier';
      case 'registrar': return 'Registrar';
      default: return 'Staff';
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStaffSidebar(!staffSidebar)}
          className="p-1.5 rounded text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 md:hidden"
          aria-label="Toggle Sidebar"
        >
          Menu
        </button>

        <div className="flex items-center gap-2">
          {website?.logo ? (
            <div className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 overflow-hidden relative shrink-0">
              <Image src={website.logo} alt={website.name || 'Logo'} fill className="object-cover" sizes="28px" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded bg-primary text-white flex items-center justify-center font-semibold text-xs shrink-0">
              {website?.name ? website.name.slice(0, 2).toUpperCase() : 'SP'}
            </div>
          )}
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm hidden sm:inline-block">
            {website?.name ? `${website.name} — Staff Desk` : 'Staff Portal'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language switch */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Select portal language"
          className="px-2 py-1 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 focus:outline-hidden"
        >
          {availableLanguages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Theme mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="px-2 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle display mode"
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {/* Staff badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
          {loading ? (
            <span className="w-16 h-3 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></span>
          ) : (
            <span>{staff ? `${staff.name} (${getRoleLabel(staff.role)})` : 'Staff Desk'}</span>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="px-2.5 py-1 text-xs font-medium rounded border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

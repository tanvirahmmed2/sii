'use client';
import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Link from 'next/link';
import { FiLayout, FiLogOut, FiMenu, FiMoon, FiSearch, FiSun, FiUser } from 'react-icons/fi';
const Navbar = ({ staffUser = null }: any) => {
    const router = useRouter();
    const { adminSidebar, setAdminSidebar, setStaffSidebar, website, tenantUrl, getApiEndpoint, theme, toggleTheme } = useContext<any>(TenantWebsiteContext);
    const isDark = theme === 'dark';
    const [staff, setStaff] = useState<any>(staffUser);
    useEffect(() => {
        if (staffUser)
            return;
        const fetchStaffProfile = async () => {
            try {
                const response = await fetch(getApiEndpoint('staff/me'));
                if (response.ok) {
                    const data = await response.json();
                    setStaff(data.payload?.staff || data.paylod?.staff || data.staff);
                }
            }
            catch (error: any) {
                console.error('Failed to fetch staff profile:', error);
            }
        };
        fetchStaffProfile();
    }, [staffUser, getApiEndpoint]);
    const handleFocusSidebarSearch = () => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 768) {
                if (typeof setAdminSidebar === 'function')
                    setAdminSidebar(true);
                if (typeof setStaffSidebar === 'function')
                    setStaffSidebar(true);
            }
            window.dispatchEvent(new CustomEvent('focus-staff-sidebar-search'));
        }
    };
    const handleLogout = async () => {
        try {
            const response = await fetch(getApiEndpoint('staff/logout'), {
                method: 'POST',
            });
            if (response.ok) {
                toast.success('Logged out successfully.');
                router.push(tenantUrl('/auth/access/staff/login'));
            }
            else {
                toast.error('Failed to log out.');
            }
        }
        catch {
            toast.error('Logout error occurred.');
        }
    };
    return (<nav className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 z-40 transition-colors">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setAdminSidebar(!adminSidebar)} className="inline-flex items-center justify-center p-1.5 text-sm rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 md:hidden transition-colors cursor-pointer" aria-label="Toggle Navigation">
          <FiMenu className="w-4 h-4"/>
        </button>

        <div className="flex items-center gap-2">
          <Link href="/staff-panel" className="flex items-center gap-2 text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary-light transition-colors">
            <span className="w-7 h-7 rounded bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <FiLayout className="w-3.5 h-3.5"/>
            </span>
            <span className="font-semibold text-xs sm:text-sm">
              {website?.name ? `${website.name} — Portal` : 'Portal'}
            </span>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleFocusSidebarSearch} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer" title="Search sidebar modules (Ctrl+K)">
          <FiSearch className="w-3.5 h-3.5 text-slate-400"/>
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        <button type="button" onClick={toggleTheme} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer" title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}>
          {isDark ? <FiSun className="w-3.5 h-3.5 text-amber-400"/> : <FiMoon className="w-3.5 h-3.5 text-slate-500"/>}
          <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <Link href="/staff-panel/staff-profile" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors">
          <FiUser className="w-3.5 h-3.5 text-primary"/>
          <span className="max-w-[120px] truncate">{staff ? staff.name : 'Staff Profile'}</span>
        </Link>

        <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-medium transition-colors cursor-pointer">
          <FiLogOut className="w-3.5 h-3.5"/>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>);
};
export default Navbar;

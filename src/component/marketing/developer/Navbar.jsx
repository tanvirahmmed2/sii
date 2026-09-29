'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/db/secret';
import { BiMenu, BiLogOut, BiShieldQuarter, BiCog, BiSun, BiMoon } from 'react-icons/bi';
import { useRouter } from 'next/navigation';
import { Context } from '@/components/helper/Context';

export default function AdminNavbar({ onToggleSidebar, currentUser = null }) {
  const router = useRouter();
  const { theme = 'light', toggleTheme } = useContext(Context) || {};
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    try {
      await fetch('/api/developer/me/logout', {
        method: 'POST',
      });
    } catch (_) {}
    router.push('/developer-auth/login');
    router.refresh();
  };

  const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isUserAdmin = Boolean(permissions.includes('developers'));

  return (
    <nav className="w-full flex flex-row items-center justify-between bg-white dark:bg-slate-900 px-4 shadow-sm lg:px-8 h-14 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-auto flex flex-row items-center justify-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="text-2xl md:hidden flex items-center justify-center p-1 text-slate-700 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer"
          aria-label="Toggle admin navigation menu"
        >
          <BiMenu />
        </button>
        <Link href="/developer" className="text-xl font-semibold text-slate-900 dark:text-white h-14 flex items-center gap-2">
          <span>{SITE_NAME}</span>
        </Link>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Light / Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme mode"
        >
          {isDark ? <BiSun className="text-amber-400 text-lg" /> : <BiMoon className="text-slate-600 text-lg" />}
        </button>

        <Link
          href="/developer/profile"
          className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs text-slate-700 dark:text-slate-300 font-medium transition-colors"
          title="View My Profile"
        >
          <BiShieldQuarter className={`text-sm ${isUserAdmin ? 'text-purple-600' : 'text-secondary'}`} />
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {currentUser?.name || currentUser?.email}
          </span>
        </Link>

        <Link
          href="/developer/settings"
          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title="Account Settings"
        >
          <BiCog className="text-lg" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center border border-secondary text-secondary hover:bg-secondary hover:text-white px-3 py-1 rounded-full font-semibold transition-colors duration-200 text-xs md:text-sm cursor-pointer gap-1"
        >
          <BiLogOut className="text-sm" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </nav>
  );
}

'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { SITE_NAME } from 'src/lib/database/secret';
import { useRouter } from 'next/navigation';
import { Context } from 'src/component/helper/Context';

export default function AdminNavbar({ onToggleSidebar, currentUser = null }) {
  const router = useRouter();
  const { theme = 'light', toggleTheme } = useContext(Context) || {};
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    try {
      await fetch('/api/marketing/developer/me/logout', {
        method: 'POST',
      });
    } catch (_) {}
    router.push('/developer-auth/login');
    router.refresh();
  };

  return (
    <nav className="w-full flex flex-row items-center justify-between bg-white dark:bg-slate-900 px-4 lg:px-6 h-12 sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden text-xs font-normal text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Toggle navigation"
        >
          Menu
        </button>
        <Link href="/developer" className="text-sm font-medium text-slate-900 dark:text-white">
          {SITE_NAME} Developer
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal cursor-pointer"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <Link
          href="/developer/profile"
          className="hidden sm:inline-block px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {currentUser?.name || currentUser?.email || 'Profile'}
        </Link>

        <Link
          href="/developer/settings"
          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal"
        >
          Settings
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-xs font-normal transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

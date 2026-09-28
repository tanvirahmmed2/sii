'use client';

import { useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BiLoaderAlt, BiShieldX, BiArrowBack } from 'react-icons/bi';
import { Context } from '@/components/helper/Context';
import Navbar from '@/components/developer/Navbar';
import Sidebar from '@/components/developer/Sidebar';

/**
 * @deprecated ROLE_PERMISSIONS is deprecated in favor of dynamic permissions stored in the database
 * and returned by authenticateStaff / /api/developer/me. Retained solely as a fallback for unmigrated sessions.
 */
export const ROLE_PERMISSIONS = {
  admin: [
    'overview', 'developers', 'roles', 'team', 'creators', 'users', 'websites',
    'blogs', 'themes', 'packages', 'features', 'modules', 'purchases', 'payments', 'subscriptions', 'payroll', 'my-salaries',
    'live-chats', 'chats', 'contacts', 'support', 'projects', 'reports', 'reviews', 'spams',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'leads', 'subscribers', 'apps', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'careers', 'policies'
  ],
  manager: [
    'overview', 'creators', 'users', 'websites', 'packages', 'features',
    'purchases', 'payments', 'subscriptions', 'live-chats', 'chats', 'contacts', 'support', 'projects', 'my-salaries',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'reports', 'reviews', 'leads', 'subscribers', 'apps', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'careers', 'policies'
  ],
  developer: [
    'overview', 'websites', 'themes', 'packages', 'features',
    'apps', 'spams', 'reports', 'blogs', 'support', 'projects', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'
  ],
  marketer: [
    'overview', 'blogs', 'themes', 'leads',
    'packages', 'reviews', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'
  ],
  support: [
    'overview', 'live-chats', 'chats', 'contacts', 'support', 'reports',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'reviews', 'users', 'creators', 'subscribers', 'profile', 'settings', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'
  ]
};

export default function DeveloperLayout({ children }) {
  const { user, loading } = useContext(Context);
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/developer-auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-2">
        <BiLoaderAlt className="animate-spin text-4xl text-slate-800" />
        <p className="text-slate-600 text-sm font-semibold animate-pulse">Authenticating staff session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-2">
        <BiLoaderAlt className="animate-spin text-4xl text-slate-800" />
        <p className="text-slate-600 text-sm font-semibold">Redirecting to login...</p>
      </div>
    );
  }

  const segments = pathname.split('/').filter(Boolean);
  const moduleName = segments[1] || 'overview';
  const role = (user?.role || 'developer').toLowerCase();

  const userPerms = Array.isArray(user?.permissions) ? user.permissions : null;
  const fallbackModules = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.developer || [];
  const allowedModules = userPerms && userPerms.length > 0 ? userPerms : fallbackModules;

  const isAllowed =
    !segments[1] ||
    moduleName === 'overview' ||
    moduleName === 'profile' ||
    moduleName === 'settings' ||
    allowedModules.includes(moduleName) ||
    (moduleName === 'roles' && (allowedModules.includes('developers') || allowedModules.includes('roles')));

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentUser={user}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            currentUser={user}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex items-center justify-center">
            <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-3xl">
                <BiShieldX />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Your account ({user.roleName || user.role || 'Staff'}) does not have permission to access the <span className="font-semibold text-rose-600 font-mono">/{moduleName}</span> module.
              </p>
              <Link
                href="/developer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <BiArrowBack className="text-sm" />
                <span>Return to Overview</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors">
      {/* Sidebar: persistent on desktop, drawer on mobile */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          currentUser={user}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

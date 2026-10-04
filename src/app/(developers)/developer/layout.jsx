'use client';

import { useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import Navbar from 'src/component/marketing/developer/Navbar';
import Sidebar from 'src/component/marketing/developer/Sidebar';

export const ROLE_PERMISSIONS = {
  admin: [
    'overview', 'developers', 'roles', 'team', 'creators', 'users', 'websites',
    'blogs', 'packages', 'features', 'modules', 'purchases', 'payments', 'subscriptions', 'payroll', 'my-salaries',
    'live-chats', 'chats', 'contacts', 'support', 'projects', 'reports', 'reviews', 'spams',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'leads', 'subscribers', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'policies'
  ],
  manager: [
    'overview', 'creators', 'users', 'websites', 'packages', 'features',
    'purchases', 'payments', 'subscriptions', 'live-chats', 'chats', 'contacts', 'support', 'projects', 'my-salaries',
    'facebook-messages', 'instagram-messages', 'whatsapp-messages',
    'reports', 'reviews', 'leads', 'subscribers', 'profile', 'settings', 'faqs', 'updates', 'tasks', 'notices', 'tutorials', 'policies'
  ],
  developer: [
    'overview', 'websites', 'packages', 'features',
    'spams', 'reports', 'blogs', 'support', 'live-chats', 'contacts', 'reviews', 'projects', 'profile', 'settings', 'chats', 'tasks', 'notices', 'my-salaries', 'tutorials', 'faqs', 'updates', 'policies'
  ],
  marketer: [
    'overview', 'blogs', 'leads',
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
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <p className="text-xs font-normal text-slate-500">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <p className="text-xs font-normal text-slate-500">Redirecting to login...</p>
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
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
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-3">
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">Access Restricted</h2>
              <p className="text-xs font-normal text-slate-600 dark:text-slate-400">
                Your account ({user.roleName || user.role || 'Staff'}) does not have permission to access the module <span className="font-mono">/{moduleName}</span>.
              </p>
              <div className="pt-2">
                <Link
                  href="/developer"
                  className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors"
                >
                  Return to Overview
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
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
        <main className="flex-1 p-4 sm:p-6 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

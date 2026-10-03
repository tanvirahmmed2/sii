'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS } from 'src/app/(developers)/developer/layout';

export const ADMIN_NAV_SECTIONS = [
  {
    title: 'Workspace & Overview',
    links: [
      { href: '/developer', label: 'Overview', exact: true },
      { href: '/developer/tasks', label: 'Tasks & Sprints' },
      { href: '/developer/notices', label: 'Company Notices' },
      { href: '/developer/chats', label: 'Internal Chat' },
    ],
  },
  {
    title: 'Websites & Audience',
    links: [
      { href: '/developer/websites', label: 'Websites' },
      { href: '/developer/creators', label: 'Creators' },
      { href: '/developer/users', label: 'End-Users' },
      { href: '/developer/leads', label: 'Leads' },
      { href: '/developer/subscribers', label: 'Subscribers' },
    ],
  },
  {
    title: 'Commerce & Plans',
    links: [
      { href: '/developer/packages', label: 'Packages' },
      { href: '/developer/features', label: 'Features' },
      { href: '/developer/subscriptions', label: 'Subscriptions' },
      { href: '/developer/purchases', label: 'Purchases' },
      { href: '/developer/payments', label: 'Payments' },
      { href: '/developer/projects', label: 'Custom Projects' },
    ],
  },
  {
    title: 'Content & Policies',
    links: [
      { href: '/developer/blogs', label: 'Blogs' },
      { href: '/developer/policies', label: 'Company Policies' },
      { href: '/developer/updates', label: 'Product Updates' },
      { href: '/developer/tutorials', label: 'Tutorials' },
      { href: '/developer/faqs', label: 'FAQs' },
    ],
  },
  {
    title: 'Support & Comms',
    links: [
      { href: '/developer/support', label: 'Support Tickets' },
      { href: '/developer/live-chats', label: 'Live Chats' },
      { href: '/developer/contacts', label: 'Contacts' },
      { href: '/developer/reports', label: 'Reports' },
      { href: '/developer/reviews', label: 'Reviews' },
    ],
  },
  {
    title: 'Meta Channels',
    links: [
      { href: '/developer/facebook-messages', label: 'Facebook Messages' },
      { href: '/developer/instagram-messages', label: 'Instagram Messages' },
      { href: '/developer/whatsapp-messages', label: 'WhatsApp Messages' },
    ],
  },
  {
    title: 'Team & Organization',
    links: [
      { href: '/developer/developers', label: 'Developers Team' },
      { href: '/developer/roles', label: 'Roles & Permissions' },
      { href: '/developer/payroll', label: 'Payroll & Salaries' },
      { href: '/developer/my-salaries', label: 'My Salaries' },
    ],
  },
  {
    title: 'Platform & Settings',
    links: [
      { href: '/developer/modules', label: 'Database Modules' },
      { href: '/developer/spams', label: 'Spam Defense' },
      { href: '/developer/settings', label: 'Settings' },
      { href: '/developer/profile', label: 'My Profile' },
    ],
  },
];

export const DEVELOPER_NAV_SECTIONS = ADMIN_NAV_SECTIONS;

export default function DeveloperSidebar({ isOpen, onClose, currentUser = null }) {
  const pathname = usePathname();
  const router = useRouter();

  const userPerms = Array.isArray(currentUser?.permissions) ? currentUser.permissions : null;
  const role = (currentUser?.role || 'developer').toLowerCase();
  const fallbackModules = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.developer || [];
  const allowedModules = userPerms && userPerms.length > 0 ? userPerms : fallbackModules;

  const isLinkAllowed = (link) => {
    const segments = link.href.split('/').filter(Boolean);
    const moduleName = segments[1] || 'overview';
    return (
      moduleName === 'overview' ||
      moduleName === 'profile' ||
      moduleName === 'settings' ||
      allowedModules.includes(moduleName) ||
      (moduleName === 'roles' && (allowedModules.includes('developers') || allowedModules.includes('roles')))
    );
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/marketing/developer/me/logout', {
        method: 'POST',
      });
      router.push('/developer-auth/login');
      router.refresh();
    } catch (e) {
      router.push('/developer-auth/login');
    }
  };

  const isLinkActive = (link) => {
    if (link.exact) return pathname === link.href;
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  const navContent = (
    <div className="flex flex-col h-full overflow-y-auto">
      {onClose && (
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:hidden sticky top-0 z-10">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="p-3 space-y-4 flex-1">
        {DEVELOPER_NAV_SECTIONS.map((section) => {
          const visibleLinks = section.links.filter(isLinkAllowed);
          if (visibleLinks.length === 0) return null;

          return (
            <div key={section.title} className="space-y-0.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1">
                {section.title}
              </div>
              {visibleLinks.map((link) => {
                const active = isLinkActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`block px-2.5 py-1.5 rounded text-xs transition-colors ${
                      active
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-normal'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 sticky bottom-0">
        <Link
          href="/"
          onClick={onClose}
          className="block text-center w-full py-1.5 px-3 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-normal transition-colors"
        >
          Platform Home
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-center py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-xs font-normal transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 md:hidden transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 md:hidden flex flex-col justify-between shadow-sm transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Developer Mobile Navigation"
      >
        {navContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className="hidden md:flex md:w-56 md:flex-col md:shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 z-30"
        aria-label="Developer Desktop Navigation"
      >
        {navContent}
      </aside>
    </>
  );
}

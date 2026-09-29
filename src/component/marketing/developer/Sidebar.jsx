'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SITE_NAME } from 'src/lib/database/secret';
import {
  BiX,
  BiLogOut,
  BiHome,
  BiLayer,
  BiCube,
  BiMessageSquareDetail,
  BiUserCheck,
  BiFile,
  BiChat,
  BiHeadphone,
  BiCreditCard,
  BiReceipt,
  BiCheckShield,
  BiShieldQuarter,
  BiDesktop,
  BiEnvelope,
  BiPalette,
  BiTrendingUp,
  BiUser,
  BiGroup,
  BiStar,
  BiShieldX,
  BiGridAlt,
  BiCog,
  BiHelpCircle,
  BiBell,
  BiTask,
  BiVideo,
  BiLogoFacebookCircle,
  BiLogoInstagram,
  BiLogoWhatsapp,
  BiBriefcase,
} from 'react-icons/bi';
import { ROLE_PERMISSIONS } from 'src/app/(developers)/developer/layout';

export const ADMIN_NAV_SECTIONS = [
  {
    title: 'Workspace & Overview',
    links: [
      { href: '/developer', label: 'Overview', icon: BiLayer, exact: true },
      { href: '/developer/tasks', label: 'Tasks & Sprints', icon: BiTask },
      { href: '/developer/notices', label: 'Company Notices', icon: BiBell },
      { href: '/developer/chats', label: 'Internal Chat', icon: BiMessageSquareDetail },
    ],
  },
  {
    title: 'Websites & Audience',
    links: [
      { href: '/developer/websites', label: 'Websites', icon: BiDesktop },
      { href: '/developer/creators', label: 'Creators', icon: BiGroup },
      { href: '/developer/users', label: 'End-Users', icon: BiUser },
      { href: '/developer/leads', label: 'Leads', icon: BiTrendingUp },
      { href: '/developer/subscribers', label: 'Subscribers', icon: BiEnvelope },
    ],
  },
  {
    title: 'Commerce & Plans',
    links: [
      { href: '/developer/packages', label: 'Packages', icon: BiCube },
      { href: '/developer/features', label: 'Features', icon: BiCheckShield },
      { href: '/developer/subscriptions', label: 'Subscriptions', icon: BiCheckShield },
      { href: '/developer/purchases', label: 'Purchases', icon: BiReceipt },
      { href: '/developer/payments', label: 'Payments', icon: BiCreditCard },
      { href: '/developer/projects', label: 'Custom Projects', icon: BiBriefcase },
    ],
  },
  {
    title: 'Content & Design',
    links: [
      { href: '/developer/themes', label: 'Themes', icon: BiPalette },
      { href: '/developer/blogs', label: 'Blogs', icon: BiFile },
      { href: '/developer/policies', label: 'Company Policies', icon: BiCheckShield },
      { href: '/developer/updates', label: 'Product Updates', icon: BiBell },
      { href: '/developer/tutorials', label: 'Video Tutorials', icon: BiVideo },
      { href: '/developer/faqs', label: 'FAQs', icon: BiHelpCircle },
    ],
  },
  {
    title: 'Support & Comms',
    links: [
      { href: '/developer/support', label: 'Support Tickets', icon: BiHeadphone },
      { href: '/developer/live-chats', label: 'Live Chats', icon: BiChat },
      { href: '/developer/contacts', label: 'Contacts', icon: BiEnvelope },
      { href: '/developer/reports', label: 'Reports', icon: BiMessageSquareDetail },
      { href: '/developer/reviews', label: 'Reviews', icon: BiStar },
    ],
  },
  {
    title: 'Meta Channels',
    links: [
      { href: '/developer/facebook-messages', label: 'Facebook Messages', icon: BiLogoFacebookCircle },
      { href: '/developer/instagram-messages', label: 'Instagram Messages', icon: BiLogoInstagram },
      { href: '/developer/whatsapp-messages', label: 'WhatsApp Messages', icon: BiLogoWhatsapp },
    ],
  },
  {
    title: 'Team & Organization',
    links: [
      { href: '/developer/developers', label: 'Developers Team', icon: BiUserCheck },
      { href: '/developer/roles', label: 'Roles & Permissions', icon: BiShieldQuarter },
      { href: '/developer/payroll', label: 'Payroll & Salaries', icon: BiCreditCard },
      { href: '/developer/my-salaries', label: 'My Salaries', icon: BiCreditCard },
      { href: '/developer/careers', label: 'Careers & Hiring', icon: BiBriefcase },
    ],
  },
  {
    title: 'Platform & Settings',
    links: [
      { href: '/developer/apps', label: 'Ecosystem Apps', icon: BiGridAlt },
      { href: '/developer/modules', label: 'Database Modules', icon: BiGridAlt },
      { href: '/developer/spams', label: 'Spam Defense', icon: BiShieldX },
      { href: '/developer/settings', label: 'Settings', icon: BiCog },
      { href: '/developer/profile', label: 'My Profile', icon: BiUser },
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
      await fetch('/api/developer/me/logout', {
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
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
       

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-2xl p-1 text-slate-500 hover:text-secondary rounded-md transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <BiX />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="p-3 space-y-5 flex-1">
        {DEVELOPER_NAV_SECTIONS.map((section) => {
          const visibleLinks = section.links.filter(isLinkAllowed);
          if (visibleLinks.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                {section.title}
              </div>
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const active = isLinkActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-primary/15 text-slate-900 dark:text-white border-l-4 border-primary font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`text-base ${active ? 'text-primary' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer CTA and Actions */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 sticky bottom-0 transition-colors">
        <Link
          href="/"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
        >
          <BiHome className="text-sm" />
          <span>Platform Home</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border border-secondary text-secondary hover:bg-secondary hover:text-white py-2 px-3 rounded-lg font-semibold transition-colors duration-200 text-xs cursor-pointer"
        >
          <BiLogOut className="text-sm" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 md:hidden flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Developer Mobile Navigation"
      >
        {navContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 z-30 transition-colors"
        aria-label="Developer Desktop Navigation"
      >
        {navContent}
      </aside>
    </>
  );
}

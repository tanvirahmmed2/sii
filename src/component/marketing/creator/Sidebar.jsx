'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BiLayer,
  BiDesktop,
  BiCube,
  BiCreditCard,
  BiHeadphone,
  BiStar,
  BiBell,
  BiUser,
  BiCog,
  BiLogOut,
  BiHome,
  BiX,
  BiCheckShield,
  BiBriefcase,
} from 'react-icons/bi';

export const CREATOR_NAV_SECTIONS = [
  {
    title: 'Workspace',
    links: [
      { href: '', label: 'Overview', icon: BiLayer, exact: true },
      { href: '/webites', label: 'My Websites', icon: BiDesktop },
      { href: '/projects', label: 'Custom Projects', icon: BiBriefcase },
      { href: '/subscription', label: 'My Subscription', icon: BiCheckShield },
      { href: '/purchases', label: 'Packages & Plans', icon: BiCube },
      { href: '/payments', label: 'Billing & Invoices', icon: BiCreditCard },
    ],
  },
  {
    title: 'Engagement & Comms',
    links: [
      { href: '/tickets', label: 'Support Tickets', icon: BiHeadphone },
      { href: '/reviews', label: 'Client Reviews', icon: BiStar },
      { href: '/updates', label: 'Product Updates', icon: BiBell },
    ],
  },
  {
    title: 'Account Settings',
    links: [
      { href: '/profile', label: 'Creator Profile', icon: BiUser },
      { href: '/settings', label: 'Security & 2FA', icon: BiCog },
    ],
  },
];

export default function CreatorSidebar({
  isOpen,
  onClose,
  creator,
  activeSubscription,
  websites = [],
  stats = {},
}) {
  const pathname = usePathname();
  const router = useRouter();
  const creatorId = creator?.id || 1;

  const basePath = `/creator/${creatorId}`;
  const daysRemaining = stats?.daysRemaining ?? (activeSubscription?.current_period_end ? 30 : 0);
  const maxWebsites = stats?.maxWebsites ?? activeSubscription?.max_websites ?? activeSubscription?.max_portfolios ?? 1;
  const websitesCount = websites.length;

  const isLinkActive = (link) => {
    const fullHref = `${basePath}${link.href}`;
    if (link.exact) {
      return pathname === fullHref || pathname === `${fullHref}/`;
    }
    return pathname.startsWith(fullHref);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (_) {}
    router.push('/creator/login');
  };

  const navContent = (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
        <Link href={basePath} className="flex items-center gap-2">
          
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 leading-tight">Creator Portal</span>
          </div>
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-2xl p-1 text-slate-500 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <BiX />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="p-3 space-y-5 flex-1">
        {CREATOR_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
              {section.title}
            </div>
            {section.links.map((link) => {
              const Icon = link.icon;
              const active = isLinkActive(link);
              const targetHref = `${basePath}${link.href}`;

              return (
                <Link
                  key={link.label}
                  href={targetHref}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`text-base ${active ? 'text-slate-900' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </div>

                  {link.href === '/webites' && websites.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {websites.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Plan Quota Widget */}
      <div className="p-3 mx-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-600 font-medium">Websites Quota</span>
          <span className="text-slate-900 font-bold font-mono">
            {websitesCount} / {maxWebsites}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.round((websitesCount / (maxWebsites || 1)) * 100))}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] pt-0.5">
          <span className="text-slate-500">
            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'No active package'}
          </span>
          <Link
            href={`${basePath}/purchases`}
            className="text-secondary font-bold hover:underline"
          >
            Upgrade →
          </Link>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-100 bg-white space-y-2 sticky bottom-0">
        <Link
          href="/"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
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
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 md:hidden flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Creator Mobile Navigation"
      >
        {navContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 z-30"
        aria-label="Creator Desktop Navigation"
      >
        {navContent}
      </aside>
    </>
  );
}

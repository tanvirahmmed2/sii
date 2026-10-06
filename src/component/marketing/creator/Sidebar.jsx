'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export const CREATOR_NAV_SECTIONS = [
  {
    title: 'Workspace',
    links: [
      { href: '', label: 'Overview', exact: true },
      { href: '/workspace', label: 'My Websites' },
      { href: '/projects', label: 'Custom Projects' },
      { href: '/subscription', label: 'My Subscription' },
      { href: '/purchases', label: 'Packages & Plans' },
      { href: '/payments', label: 'Billing & Invoices' },
    ],
  },
  {
    title: 'Engagement & Comms',
    links: [
      { href: '/tickets', label: 'Support Tickets' },
      { href: '/reviews', label: 'Reviews' },
      { href: '/updates', label: 'Updates' },
    ],
  },
  {
    title: 'Account Settings',
    links: [
      { href: '/profile', label: 'Profile' },
      { href: '/settings', label: 'Security' },
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
      await fetch('/api/marketing/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (_) {}
    router.push('/creator/login');
  };

  const navContent = (
    <div className="flex flex-col h-full overflow-y-auto bg-white text-slate-800 text-xs">
      {/* Top Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10">
        <Link href={basePath} className="font-semibold text-slate-900 tracking-tight text-sm">
          Creator Panel
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-xs text-slate-500 hover:text-slate-900 px-2 py-1 border border-slate-200 rounded cursor-pointer"
            aria-label="Close menu"
          >
            Close
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="p-2 space-y-4 flex-1">
        {CREATOR_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2.5 py-1">
              {section.title}
            </div>
            {section.links.map((link) => {
              const active = isLinkActive(link);
              const targetHref = `${basePath}${link.href}`;

              return (
                <Link
                  key={link.label}
                  href={targetHref}
                  onClick={onClose}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold border-l-2 border-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                  }`}
                >
                  <span>{link.label}</span>

                  {(link.href === '/workspace' || link.href === '/webites') && websitesCount > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {websitesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Plan Quota Widget */}
      <div className="p-3 m-2 rounded border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-600">Websites Quota</span>
          <span className="text-slate-900 font-mono">
            {websitesCount} / {maxWebsites}
          </span>
        </div>
        <div className="w-full h-1 bg-slate-200 rounded-sm overflow-hidden">
          <div
            className="h-full bg-slate-800 rounded-sm"
            style={{
              width: `${Math.min(100, Math.round((websitesCount / (maxWebsites || 1)) * 100))}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] pt-0.5 text-slate-500">
          <span>{daysRemaining > 0 ? `${daysRemaining}d remaining` : 'No active plan'}</span>
          <Link href={`${basePath}/purchases`} className="text-slate-800 font-semibold hover:underline">
            Renew / Change
          </Link>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-2 border-t border-slate-200 bg-white space-y-1 sticky bottom-0">
        <Link
          href="/"
          onClick={onClose}
          className="w-full block text-center py-1.5 px-3 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
        >
          Platform Home
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full block text-center border border-slate-300 text-slate-700 hover:bg-slate-100 py-1.5 px-3 rounded font-medium transition-colors text-xs cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-50 md:hidden transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 max-w-[85vw] bg-white z-50 md:hidden flex flex-col justify-between border-r border-slate-200 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Creator Mobile Navigation"
      >
        {navContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className="hidden md:flex md:w-56 md:flex-col md:shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 z-30"
        aria-label="Creator Desktop Navigation"
      >
        {navContent}
      </aside>
    </>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreatorNavbar({
  creator,
  websites = [],
  activeSubscription = null,
  onToggleSidebar,
  onOpenCreateWebsite,
}) {
  const router = useRouter();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [websiteDropdownOpen, setWebsiteDropdownOpen] = useState(false);

  const creatorId = creator?.id || 1;
  const primaryWebsite = websites[0] || null;
  const hasActiveSub = Boolean(activeSubscription && (activeSubscription.status === 'active' || activeSubscription.status === 'ACTIVE'));

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

  return (
    <nav className="w-full flex flex-row items-center justify-between bg-white px-4 h-12 sticky top-0 z-30 border-b border-slate-200 text-xs">
      {/* Left: Mobile Toggle & Brand / Website Switcher */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden px-2 py-1 text-slate-700 hover:text-slate-900 border border-slate-200 rounded cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          Menu
        </button>

        <div className="flex items-center gap-3">
          <Link
            href={`/creator/${creatorId}`}
            className="text-sm font-semibold text-slate-900"
          >
            Studio
          </Link>

          {websites.length > 0 && (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setWebsiteDropdownOpen((p) => !p)}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-xs text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <span className="font-medium text-slate-800 truncate max-w-[140px]">
                  {primaryWebsite?.subdomain}
                </span>
                <span className="text-slate-400 text-[10px]">▼</span>
              </button>

              {websiteDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setWebsiteDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-1 w-60 rounded bg-white border border-slate-200 shadow-md p-2 z-50">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Websites ({websites.length})
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                      {websites.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-medium text-slate-900 truncate">{w.name}</p>
                            <p className="text-[10px] font-mono text-slate-500 truncate">
                              {w.subdomain}
                            </p>
                          </div>
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                              w.is_published
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {w.is_published ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-1.5 border-t border-slate-100">
                      <Link
                        href={`/creator/${creatorId}/workspace`}
                        onClick={() => setWebsiteDropdownOpen(false)}
                        className="block text-center w-full py-1 rounded bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
                      >
                        Manage All Websites
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2">
        {hasActiveSub ? (
          <button
            type="button"
            onClick={onOpenCreateWebsite}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            New Website
          </button>
        ) : (
          <Link
            href={`/creator/${creatorId}/purchases`}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
          >
            Select Plan
          </Link>
        )}

        {primaryWebsite && (
          <a
            href={`/sites/${primaryWebsite.subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-block px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            Live Site
          </a>
        )}

        <Link
          href={`/creator/${creatorId}/updates`}
          className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          title="Product Updates"
        >
          Updates
        </Link>

        {/* Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen((p) => !p)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-xs text-slate-700 font-medium transition-colors cursor-pointer"
          >
            <span className="font-medium text-slate-800 max-w-[100px] truncate">
              {creator?.name || 'Account'}
            </span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-52 rounded bg-white border border-slate-200 shadow-md p-2 z-50">
                <div className="px-2 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">{creator?.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{creator?.email}</p>
                  <span className="mt-1 inline-block text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {activeSubscription?.package_name || 'Creator Tier'}
                  </span>
                </div>

                <div className="py-1 text-xs space-y-0.5">
                  <Link
                    href={`/creator/${creatorId}/profile`}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="block px-2 py-1 rounded text-slate-700 hover:bg-slate-50 font-normal transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    href={`/creator/${creatorId}/purchases`}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="block px-2 py-1 rounded text-slate-700 hover:bg-slate-50 font-normal transition-colors"
                  >
                    Purchases & Plan
                  </Link>
                  <Link
                    href={`/creator/${creatorId}/settings`}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="block px-2 py-1 rounded text-slate-700 hover:bg-slate-50 font-normal transition-colors"
                  >
                    Security & Sessions
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-2 py-1 rounded text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

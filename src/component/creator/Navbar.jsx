'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SITE_NAME } from '@/lib/db/secret';
import {
  BiMenu,
  BiPlus,
  BiChevronDown,
  BiLogOut,
  BiCheckShield,
  BiDesktop,
  BiBell,
  BiLinkExternal,
  BiUser,
} from 'react-icons/bi';

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
  const hasActiveSub = Boolean(activeSubscription && activeSubscription.status === 'ACTIVE');

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

  return (
    <nav className="w-full flex flex-row items-center justify-between bg-white px-4 shadow-xs lg:px-8 h-14 sticky top-0 z-30 border-b border-slate-200">
      {/* Left: Mobile Toggle & Brand / Website Switcher */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="text-2xl md:hidden flex items-center justify-center p-1 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Toggle creator navigation menu"
        >
          <BiMenu />
        </button>

        <div className="flex items-center gap-3">
          <Link
            href={`/creator/${creatorId}`}
            className="text-lg font-bold text-slate-900 flex items-center gap-2 group"
          >
            <span className="hidden sm:inline font-bold tracking-tight">Creator Studio</span>
          </Link>

          {websites.length > 0 && (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setWebsiteDropdownOpen((p) => !p)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-700 font-medium transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                  {primaryWebsite?.subdomain}.saas
                </span>
                <BiChevronDown className="text-slate-500 text-xs" />
              </button>

              {websiteDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setWebsiteDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Your Hosted Websites ({websites.length})
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                      {websites.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 group transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-slate-900 truncate">{w.name}</p>
                            <p className="text-[11px] font-mono text-slate-500 truncate">
                              {w.subdomain}.saasplatform.com
                            </p>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              w.is_published
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {w.is_published ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <Link
                        href={`/creator/${creatorId}/webites`}
                        onClick={() => setWebsiteDropdownOpen(false)}
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                      >
                        <BiDesktop />
                        <span>Manage All Websites</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Action Buttons & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {hasActiveSub ? (
          <button
            type="button"
            onClick={onOpenCreateWebsite}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <BiPlus className="text-base" />
            <span className="hidden sm:inline">New Website</span>
          </button>
        ) : (
          <Link
            href={`/creator/${creatorId}/purchases`}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <BiPlus className="text-base" />
            <span>Select Package</span>
          </Link>
        )}

        {primaryWebsite && (
          <a
            href={`/sites/${primaryWebsite.subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <span>Live Site</span>
            <BiLinkExternal className="text-xs text-secondary" />
          </a>
        )}

        <Link
          href={`/creator/${creatorId}/updates`}
          className="p-1.5 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors relative"
          title="Product Updates"
        >
          <BiBell className="text-lg" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-secondary"></span>
        </Link>

        {/* Profile Pill & Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen((p) => !p)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-700 font-medium transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-[10px] border border-secondary/20">
              {creator?.name ? creator.name.charAt(0).toUpperCase() : <BiUser className="text-xs" />}
            </div>
            <span className="font-semibold text-slate-800 hidden md:inline max-w-[110px] truncate">
              {creator?.name || 'Creator'}
            </span>
            <BiChevronDown className="text-slate-500 text-xs" />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 truncate">{creator?.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{creator?.email}</p>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <BiCheckShield className="text-xs text-secondary" />
                    <span>{activeSubscription?.package_name || 'Creator Tier'}</span>
                  </div>
                </div>

                <div className="space-y-0.5 py-1 text-xs">
                  <Link
                    href={`/creator/${creatorId}/profile`}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                  >
                    <span>Creator Profile</span>
                  </Link>
                  <Link
                    href={`/creator/${creatorId}/purchases`}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                  >
                    <span>My Subscriptions</span>
                  </Link>
                  <Link
                    href={`/creator/${creatorId}/settings`}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                  >
                    <span>Account Settings</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors"
                  >
                    <BiLogOut className="text-sm" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="hidden sm:inline-flex items-center justify-center border border-secondary text-secondary hover:bg-secondary hover:text-white px-3 py-1 rounded-full font-semibold transition-colors duration-200 text-xs cursor-pointer gap-1"
        >
          <BiLogOut className="text-sm" />
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  );
}

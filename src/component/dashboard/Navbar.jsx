'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutGridIcon,
  BoxIcon,
  UsersIcon,
  StarIcon,
  ExternalLinkIcon,
} from '@/components/ui/Icons';

export default function DashboardNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutGridIcon },
    { href: '/dashboard/blog', label: 'Blog', icon: BoxIcon },
    { href: '/dashboard/appointments', label: 'Appointments', icon: LayoutGridIcon },
    { href: '/dashboard/experiences', label: 'Experiences', icon: LayoutGridIcon },
    { href: '/dashboard/reviews', label: 'Reviews', icon: StarIcon },
    { href: '/dashboard/team', label: 'Team & Roles', icon: UsersIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Context */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              C
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base leading-tight tracking-tight">Creator Portal</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">Website Workspace</span>
            </div>
          </Link>

          {/* Module Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 text-xs font-medium">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">alex-design.platform</span>
          </div>

          <a
            href="/sites/alex-design"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span>Live Site</span>
            <ExternalLinkIcon className="w-3 h-3 text-pink-400" />
          </a>

          <Link
            href="/builder/d0000000-0000-0000-0000-000000000001"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
          >
            <BoxIcon className="w-3.5 h-3.5" />
            <span>Canvas Builder</span>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-slate-950 px-4 py-3 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 text-emerald-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <a
              href="/sites/alex-design"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
            >
              <span>View Live Portfolio</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/builder/d0000000-0000-0000-0000-000000000001"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow"
            >
              <BoxIcon className="w-4 h-4" />
              <span>Canvas Builder</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

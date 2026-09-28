'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BoxIcon,
  LayoutGridIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  StarIcon,
} from '@/components/ui/Icons';

export default function BuilderNavbar({
  subdomain = 'alex-design',
  portfolioTitle = 'Alex Vance – Portfolio',
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-indigo-500/20 bg-slate-950/90 backdrop-blur-xl shadow-lg shadow-indigo-950/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Studio Mode */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group" title="Return to Creator Dashboard">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <BoxIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-base leading-tight tracking-tight flex items-center gap-2">
                Canvas Studio
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <StarIcon filled className="w-2.5 h-2.5 text-pink-400" />
                  BUILDER
                </span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Drag-and-Drop Realtime Engine
              </span>
            </div>
          </Link>

          {/* Active Website Context */}
          <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Website:</span>
            <span className="font-mono font-bold text-white tracking-tight">{subdomain}.platform</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all"
          >
            <LayoutGridIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>← Dashboard</span>
          </Link>

          <a
            href={`/sites/${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 transition-all shadow-sm"
            title="Open Live Public Portfolio Site"
          >
            <span>Live Site</span>
            <ExternalLinkIcon className="w-3 h-3 text-emerald-400" />
          </a>

          <Link
            href="/admin"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            title="Switch to Admin Center"
          >
            <ShieldCheckIcon className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Admin Hub</span>
          </Link>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
          >
            Home
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle builder menu"
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
        <div className="sm:hidden border-t border-white/10 bg-slate-950 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400">Website:</span>
            <span className="font-mono font-bold text-white">{subdomain}.platform</span>
          </div>

          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/5"
          >
            <LayoutGridIcon className="w-4 h-4 text-emerald-400" />
            <span>← Back to Dashboard</span>
          </Link>

          <a
            href={`/sites/${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
          >
            <span>Preview Live Site</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </a>

          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5"
          >
            <ShieldCheckIcon className="w-4 h-4 text-rose-400" />
            <span>Admin Center</span>
          </Link>

          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5"
          >
            <ExternalLinkIcon className="w-4 h-4 text-indigo-400" />
            <span>Platform Home</span>
          </Link>
        </div>
      )}
    </header>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { SITE_NAME } from 'src/lib/database/secret';

export default function CreatorAuthLayout({
  headline = 'Creator Studio',
  description = 'Educational portfolio website builder and creator management workspace.',
  features = [
    'Subdomain and custom domain routing',
    'Drag-and-drop website editor',
    'Direct support and developer collaboration',
  ],
  children,
}) {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 lg:flex lg:flex-row text-xs">
      {/* Left Branding Column */}
      <div className="hidden lg:flex lg:w-5/12 bg-slate-900 text-white p-8 lg:p-12 flex-col justify-between shrink-0">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-base font-semibold text-white hover:text-slate-300 transition-colors"
          >
            {SITE_NAME}
          </Link>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded border border-slate-700"
          >
            Home
          </Link>
        </div>

        <div className="space-y-4 my-auto max-w-sm">
          <h2 className="text-xl font-semibold text-white leading-snug">
            {headline}
          </h2>
          <p className="text-slate-400 text-xs leading-normal">
            {description}
          </p>

          <div className="space-y-2 pt-2 text-slate-300">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-slate-500 font-mono">-</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Educational SaaS Multi-Tenant Platform
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 sm:px-6 lg:p-10 bg-slate-50">
        <div className="max-w-sm w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

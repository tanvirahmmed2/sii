'use client';

import React from 'react';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/db/secret';
import {
  BiRocket,
  BiCheckCircle,
  BiStar,
  BiShieldQuarter,
  BiArrowBack,
  BiCube,
  BiGlobe,
  BiCart,
} from 'react-icons/bi';

export default function CreatorAuthLayout({
  badge = 'Creator Studio',
  headline = 'Build Your Identity on Web',
  description = 'The visual website builder and unified commerce engine designed for ambitious creators, developers, and modern agencies.',
  features = [
    'Pixel-perfect drag & drop canvas with instant cloud publishing',
    'Integrated store engine with 0% platform cuts and instant payouts',
    'Automated appointment bookings, lead management, and live chat',
  ],
  children,
}) {
  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors lg:flex lg:flex-row">
      {/* ======================================================== */}
      {/* LEFT COLUMN: Brand Hero, Visual Showcase & Social Proof  */}
      {/* Shown ONLY on larger screens (lg: and above)             */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden bg-primary-dark text-white p-8 sm:p-12 lg:p-16 flex-col justify-between border-r border-slate-800 shrink-0">
        
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-white hover:text-slate-200 transition-colors inline-block"
          >
            {SITE_NAME}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-light hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <BiArrowBack className="text-sm" />
            <span>Home</span>
          </Link>
        </div>

        {/* Center: Headline & Creator Value Pillars */}
        <div className="relative z-10 my-10 sm:my-14 space-y-6">
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-tight">
            {headline}
          </h2>

          <p className="text-sm text-light leading-relaxed max-w-lg font-normal">
            {description}
          </p>

          {/* Feature Checklist */}
          <div className="space-y-3 pt-2">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-light">
                <BiCheckCircle className="text-emerald-400 text-base shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
      <div className="flex-1 min-h-screen flex flex-col justify-center lg:justify-between px-4 py-8 sm:px-6 lg:p-12 xl:p-16 bg-slate-50 dark:bg-slate-950 lg:bg-slate-50/70 lg:dark:bg-slate-900/60 overflow-y-auto">
        

        {/* Form Container (Centered with max-w-md width) */}
        <div className="max-w-md w-full mx-auto my-auto py-2 sm:py-4 h-screen">
          {children}
        </div>

        {/* Bottom Security / Privacy Footer (visible on lg+) */}
        <div className="w-full hidden lg:block pt-8 text-center text-[11px] text-slate-400 dark:text-slate-500">
          <p>
            Protected by bank-grade 256-bit SSL encryption. By continuing, you agree to our{' '}
            <Link href="/faqs" className="underline hover:text-slate-600 dark:hover:text-light">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/faqs" className="underline hover:text-slate-600 dark:hover:text-light">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

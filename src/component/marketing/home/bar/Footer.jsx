'use client';

import { useContext } from 'react';
import Link from 'next/link';
import {
  COMPANY_NAME,
  COMPANY_URL,
  SITE_ADDRESS,
  SITE_CONTACT,
  SITE_MAIL,
  SITE_NAME,
} from 'src/lib/database/secret';
import { Context } from 'src/component/helper/Context';
import TranslateButton from 'src/component/website/ui/TranslateButton';
import SubscribeForm from './SubscribeForm';

const Footer = () => {
  const { theme = 'light', toggleTheme, setTheme, creator } = useContext(Context);
  const isDark = theme === 'dark';

  return (
    <footer className="w-full bg-slate-900 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-slate-100 transition-colors border-t border-slate-800 dark:border-slate-800">
      <div className="w-full max-w-7xl mx-auto flex flex-col space-y-10">
        {/* ======================================================== */}
        {/* LAYER 1 (TOP): Company Identity & Newsletter Subscribe   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-8 border-b border-slate-800">
          {/* Company Brand & Overview */}
          <div className="lg:col-span-7 space-y-2">
            <div className="space-y-1">
              <Link
                href="/"
                className="text-2xl sm:text-3xl font-semibold tracking-tight text-white hover:text-slate-200 transition-colors inline-block"
              >
                {SITE_NAME}
              </Link>
              <p className="text-xs sm:text-sm font-medium text-emerald-400">
                Build your institutional identity on the modern web
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed font-normal">
              The all-in-one portfolio website and multi-tenant commerce engine designed for educational institutions,
              creators, and modern academic academies. Intuitive visual studio with enterprise backend infrastructure.
            </p>
          </div>

          {/* Newsletter Subscription Component */}
          <div className="lg:col-span-5 p-5 rounded-md bg-slate-950/60 border border-slate-800">
            <SubscribeForm source="HOME_FOOTER" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* LAYER 2 (MIDDLE): Four Columns of Links & Contact        */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
          {/* Column 1: Products */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Products
            </p>
            <ul className="space-y-2 text-xs text-slate-400 font-normal">
              <li>
                <Link href="/packages" className="hover:text-white transition-colors">
                  Packages &amp; Pricing
                </Link>
              </li>
              <li>
                <Link href="/updates" className="hover:text-white transition-colors">
                  Platform Updates
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-white transition-colors">
                  Verified Reviews
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Resources */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Resources
            </p>
            <ul className="space-y-2 text-xs text-slate-400 font-normal">
              <li>
                <Link href="/tutorials" className="hover:text-white transition-colors">
                  Video Tutorials
                </Link>
              </li>
              <li>
                <Link href="/blogs" className="hover:text-white transition-colors">
                  Articles &amp; Blogs
                </Link>
              </li>
              <li>
                <Link href="/faqs" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Platform
            </p>
            <ul className="space-y-2 text-xs text-slate-400 font-normal">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/policies" className="hover:text-white transition-colors">
                  Company Policies
                </Link>
              </li>
              {creator?.id ? (
                <li>
                  <Link
                    href={`/creator/${creator.id}`}
                    className="hover:text-white transition-colors text-emerald-400 font-medium"
                  >
                    Creator Studio Panel →
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      href="/creator/login"
                      className="hover:text-white transition-colors text-emerald-400 font-medium"
                    >
                      Creator Login →
                    </Link>
                  </li>
                  <li>
                    <Link href="/creator/register" className="hover:text-white transition-colors">
                      Start Building Free
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 4: Contact & Location */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Contact &amp; Location
            </p>
            <div className="space-y-2 text-xs text-slate-400 font-normal">
              <div>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  <span>Contact &amp; Support</span>
                  <span>→</span>
                </Link>
              </div>

              <div className="pt-1 space-y-1.5 font-mono text-[11px]">
                {SITE_MAIL && (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 font-sans text-[10px] uppercase">[Email]</span>
                    <a href={`mailto:${SITE_MAIL}`} className="hover:text-white transition-colors truncate">
                      {SITE_MAIL}
                    </a>
                  </div>
                )}

                {SITE_CONTACT && (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 font-sans text-[10px] uppercase">[Phone]</span>
                    <a href={`tel:${SITE_CONTACT}`} className="hover:text-white transition-colors truncate">
                      {SITE_CONTACT}
                    </a>
                  </div>
                )}

                {SITE_ADDRESS && (
                  <div className="flex items-start gap-1.5 pt-0.5">
                    <span className="text-slate-500 font-sans text-[10px] uppercase shrink-0 mt-0.5">[Address]</span>
                    <span className="line-clamp-2 text-slate-400 font-sans text-xs">{SITE_ADDRESS}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LAYER 3 (BOTTOM): Controls, Theme Mode, Translate, Copr  */}
        {/* ======================================================== */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 pt-2">
          {/* Copyright notice */}
          <p className="order-2 md:order-1 text-center md:text-left font-normal">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>

          {/* Controls: Color Mode & Translation */}
          <div className="order-1 md:order-2 flex flex-wrap items-center justify-center gap-3">
            {/* Mode switch */}
            <div className="inline-flex items-center rounded border border-slate-700 bg-slate-950 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => (typeof setTheme === 'function' ? setTheme('light') : typeof toggleTheme === 'function' ? toggleTheme() : null)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  !isDark ? 'bg-white text-slate-900 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
                title="Light Mode"
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => (typeof setTheme === 'function' ? setTheme('dark') : typeof toggleTheme === 'function' ? toggleTheme() : null)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
                title="Dark Mode"
              >
                Dark
              </button>
            </div>

            {/* Language switch */}
            <TranslateButton align="right" variant="dark" />
          </div>

          {/* Company attribution */}
          <p className="order-3 text-center md:text-right font-normal">
            A Product of{' '}
            <Link
              href={`${COMPANY_URL}`}
              className="text-slate-200 hover:text-white font-medium underline transition-colors"
            >
              {COMPANY_NAME}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
'use client';

import { useContext } from 'react';
import Link from 'next/link';
import {
  BiSun,
  BiMoon,
  BiEnvelope,
  BiPhone,
  BiMapPin,
  BiRightArrowAlt,
} from 'react-icons/bi';
import {
  COMPANY_NAME,
  COMPANY_URL,
  SITE_ADDRESS,
  SITE_CONTACT,
  SITE_MAIL,
  SITE_NAME,
} from '@/lib/db/secret';
import { Context } from '@/components/helper/Context';
import SubscribeForm from '@/components/home/bar/SubscribeForm';
import TranslateButton from '@/components/ui/TranslateButton';

const Footer = () => {
  const { theme = 'light', toggleTheme, setTheme, creator } = useContext(Context) || {};
  const isDark = theme === 'dark';

  return (
    <footer className="w-full bg-slate-900 dark:bg-slate-950 px-4 sm:px-8 lg:px-12 py-12 sm:py-16 text-slate-100 transition-colors border-t border-slate-800 dark:border-slate-900">
      <div className="w-full flex flex-col space-y-12">
        {/* ======================================================== */}
        {/* LAYER 1 (TOP): Company Identity & Newsletter Subscribe   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pb-10 border-b border-white/10 dark:border-slate-800/80">
          {/* Company Brand & Overview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="space-y-1">
              <Link
                href="/"
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white hover:text-slate-200 transition-colors inline-block"
              >
                {SITE_NAME}
              </Link>
              <p className="text-xs sm:text-sm font-semibold text-emerald-400 dark:text-emerald-300">
                Build your identity on the modern web
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-400 max-w-xl leading-relaxed">
              The all-in-one portfolio website and commerce engine designed for creators, developers,
              designers, and modern agencies. Intuitive visual studio with enterprise backend infrastructure.
            </p>
          </div>

          {/* Newsletter Subscription Component */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white/5 dark:bg-slate-900/60 border border-white/10 dark:border-slate-800 shadow-xl">
            <SubscribeForm source="HOME_FOOTER" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* LAYER 2 (MIDDLE): Four Unique Columns of Links & Contact */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-10 pb-10 border-b border-white/10 dark:border-slate-800/80">
          {/* Column 1: Products */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Products
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 dark:text-slate-400">
              <li>
                <Link
                  href="/themes"
                  className="hover:text-white transition-colors"
                >
                  Themes
                </Link>
              </li>
              <li>
                <Link
                  href="/apps"
                  className="hover:text-white transition-colors"
                >
                  Ecosystem Apps
                </Link>
              </li>
              <li>
                <Link
                  href="/packages"
                  className="hover:text-white transition-colors"
                >
                  Packages &amp; Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/updates"
                  className="hover:text-white transition-colors"
                >
                  Platform Updates
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Resources */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Resources
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 dark:text-slate-400">
              <li>
                <Link
                  href="/tutorials"
                  className="hover:text-white transition-colors"
                >
                  Video Tutorials
                </Link>
              </li>
              <li>
                <Link
                  href="/blogs"
                  className="hover:text-white transition-colors"
                >
                  Articles &amp; Blogs
                </Link>
              </li>
              <li>
                <Link
                  href="/faqs"
                  className="hover:text-white transition-colors"
                >
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link
                  href="/reviews"
                  className="hover:text-white transition-colors"
                >
                  Verified Reviews
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Access */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Platform
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 dark:text-slate-400">
              <li>
                <Link
                  href="/about"
                  className="hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span>Careers</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/policies"
                  className="hover:text-white transition-colors"
                >
                  Company Policies
                </Link>
              </li>
              {creator?.id ? (
                <li>
                  <Link
                    href={`/creator/${creator.id}`}
                    className="hover:text-white transition-colors text-emerald-400 font-medium"
                  >
                    Creator Studio Panel
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      href="/creator/login"
                      className="hover:text-white transition-colors text-emerald-400 font-medium"
                    >
                      Creator Studio Login
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/creator/register"
                      className="hover:text-white transition-colors"
                    >
                      Start Building Free
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 4: Contact & Addresses (Dedicated Contact Column) */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Contact &amp; Location
            </p>
            <div className="space-y-2.5 text-xs text-slate-300 dark:text-slate-400">
              <div>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                >
                  <span>Contact &amp; Inquiries</span>
                  <BiRightArrowAlt className="text-sm" />
                </Link>
              </div>

              <div className="pt-1 space-y-2">
                <a
                  href={`mailto:${SITE_MAIL}`}
                  className="flex items-center gap-2 hover:text-white transition-colors truncate font-mono"
                  title="Email Us"
                >
                  <BiEnvelope className="text-emerald-400 text-sm shrink-0" />
                  <span className="truncate">{SITE_MAIL}</span>
                </a>

                <a
                  href={`tel:${SITE_CONTACT}`}
                  className="flex items-center gap-2 hover:text-white transition-colors truncate"
                  title="Phone Number"
                >
                  <BiPhone className="text-emerald-400 text-sm shrink-0" />
                  <span className="truncate">{SITE_CONTACT}</span>
                </a>

                <div
                  className="flex items-start gap-2 leading-relaxed"
                  title="Office Address"
                >
                  <BiMapPin className="text-emerald-400 text-sm shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{SITE_ADDRESS}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LAYER 3 (BOTTOM): System Controls, Mode, Translate, Copr */}
        {/* ======================================================== */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400 font-sans pt-2">
          {/* Copyright notice */}
          <p className="order-2 md:order-1 text-center md:text-left">
            &copy; 2026 {SITE_NAME} | Build Your Identity on Web
          </p>

          {/* Controls: Color Mode & Translation */}
          <div className="order-1 md:order-2 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center p-0.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => (setTheme ? setTheme('light') : toggleTheme())}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    !isDark
                      ? 'bg-white text-slate-900 shadow-md scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Switch to Light Mode"
                  aria-label="Light mode"
                >
                  <BiSun className={!isDark ? 'text-amber-500 text-sm' : 'text-sm'} />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => (setTheme ? setTheme('dark') : toggleTheme())}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isDark
                      ? 'bg-purple-600 text-white shadow-md scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Switch to Dark Mode"
                  aria-label="Dark mode"
                >
                  <BiMoon className={isDark ? 'text-amber-300 text-sm' : 'text-sm'} />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TranslateButton align="right" variant="dark" />
            </div>
          </div>

          {/* Company attribution */}
          <p className="order-3 text-center md:text-right">
            A Product of{' '}
            <Link
              href={`${COMPANY_URL}`}
              className="text-slate-200 hover:text-white underline font-semibold transition-colors"
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
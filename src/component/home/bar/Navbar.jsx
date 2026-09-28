'use client';

import Link from 'next/link';
import { SITE_NAME } from '@/lib/db/secret';
import { BiMenu, BiChevronDown, BiGridAlt, BiRightArrowAlt } from 'react-icons/bi';
import { useContext, useState } from 'react';
import { Context } from '@/components/helper/Context';
import Sidebar from './Sidebar';

export default function HomeNavbar() {
  const { apps = [], creator } = useContext(Context) || {};
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Fixed Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 w-full flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 z-50 transition-colors shadow-xs">
        {/* ======================================================== */}
        {/* PART 1 (LEFT): Site Name & Primary Navigation Links      */}
        {/* ======================================================== */}
        <div className="flex items-center gap-5 xl:gap-8 justify-center">
          {/* Site Name / Brand */}
          <Link
            href="/"
            className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center hover:opacity-90 transition-opacity shrink-0"
          >
            {SITE_NAME}
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            <Link
              href="/themes"
              className="text-xs xl:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary-light px-3 py-2 rounded-xl  transition-colors"
            >
              Themes
            </Link>

            {/* Ecosystem Apps Dropdown */}
            <div className="relative group flex items-center">
              <Link
                href="/apps"
                className="text-xs xl:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary-light px-3 py-2 rounded-xl  transition-colors flex items-center gap-1"
              >
                <span>Apps</span>
                {apps && apps.length > 0 && (
                  <BiChevronDown className="text-xs text-slate-400 group-hover:text-secondary transition-transform duration-200 group-hover:rotate-180" />
                )}
              </Link>

              {apps && apps.length > 0 && (
                <div className="absolute left-0 top-full pt-1 hidden group-hover:flex flex-col z-50 animate-in fade-in duration-150">
                  <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200  shadow-2xl border border-slate-100 dark:border-slate-800 min-w-56 overflow-hidden">
                    
                    <div className="max-h-64 overflow-y-auto ">
                      {apps.map((a) => (
                        <Link
                          key={a.id}
                          href={a.path || `/apps/${a.slug}`}
                          className="px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-secondary flex items-center justify-between"
                        >
                          <span className="truncate">{a.title}</span>
                        </Link>
                      ))}
                    </div>
                    
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/packages"
              className="text-xs xl:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary-light px-3 py-2 rounded-xl  transition-colors"
            >
              Packages
            </Link>

        
          </div>
        </div>

        {/* ======================================================== */}
        {/* PART 2 (RIGHT): Contact, Login, Get Started & Menubar    */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Action Links (Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
            <Link
              href="/contact"
              className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary-light px-3 py-2 rounded-xl  transition-colors"
            >
              Contact
            </Link>

            {creator?.id ? (
              <Link
                href={`/creator/${creator.id}`}
                className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-full bg-secondary hover:bg-secondary-dark text-white font-bold text-xs sm:text-sm shadow-md shadow-secondary/25 hover:shadow-secondary/35 transition-all duration-200"
              >
                <span>Panel</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/creator/login"
                  className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-secondary-light px-3 py-2 rounded-xl  transition-colors"
                >
                  Login
                </Link>

                <Link
                  href="/creator/register"
                  className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-full bg-secondary hover:bg-secondary-dark text-white font-bold text-xs sm:text-sm shadow-md shadow-secondary/25 hover:shadow-secondary/35 transition-all duration-200"
                >
                  <span>Get Started</span>
                  <BiRightArrowAlt className="text-base" />
                </Link>
              </>
            )}
          </div>

          {/* Quick Panel Link on Mobile Header if logged in */}
          {creator?.id && (
            <Link
              href={`/creator/${creator.id}`}
              className="md:hidden inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary-dark text-white font-bold text-xs shadow-xs transition-all"
            >
              <BiGridAlt className="text-sm" />
              <span>Panel</span>
            </Link>
          )}

          {/* Menubar Toggle Button on the Right for Mobile */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-2xl transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <BiMenu />
          </button>
        </div>
      </nav>

      {/* Top Spacer for Fixed Navbar */}
      <div className="h-16 w-full shrink-0" aria-hidden="true" />

      {/* Right-sided Drawer Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

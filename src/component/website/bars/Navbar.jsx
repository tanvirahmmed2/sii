'use client';

import React, { useContext, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Navbar = () => {
  const {
    website,
    classes,
    clubs,
    designations,
    sidebar,
    setSidebar,
    websiteSettings,
    tenantUrl,
    theme,
    isDark,
    toggleTheme,
  } = useContext(TenantWebsiteContext);

  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const logoUrl = website?.logo || website?.favicon || null;
  const eiin = website?.eiin_number || websiteSettings?.eiin || null;

  const topNavLinkClass =
    'text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded transition-colors';
  const bottomNavLinkClass =
    'text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded transition-colors whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800';
  const dropdownTriggerClass =
    'text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded transition-colors whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1';

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      {/* Upper Navigation Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Brand & Institution Info */}
          <Link href={tenantUrl('/')} className="flex items-center gap-2.5 min-w-0 group">
            {logoUrl ? (
              <div className="relative w-8 h-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                <Image
                  src={logoUrl}
                  alt={schoolName}
                  width={32}
                  height={32}
                  className="object-contain p-0.5"
                  unoptimized={logoUrl.startsWith('http')}
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center shrink-0">
                {schoolName?.charAt(0) || 'A'}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight truncate group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                {schoolName}
              </span>
              {eiin && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  EIIN: {eiin}
                </span>
              )}
            </div>
          </Link>

          {/* Right Action Suite: Mode, Portals & Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Dark / Light Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2 sm:px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            >
              {isDark ? 'Light' : 'Dark'}
            </button>

            {/* Desktop Portal Links */}
            <div className="hidden lg:flex items-center gap-1.5 pl-1">
              <Link href={tenantUrl('/auth/student')} className={topNavLinkClass}>
                Student Portal
              </Link>
              <Link
                href={tenantUrl('/auth/access')}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs transition-colors"
              >
                Staff Login
              </Link>
            </div>

            {/* Mobile Navigation Drawer Trigger */}
            <button
              type="button"
              onClick={() => setSidebar(!sidebar)}
              className="md:hidden px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              Menu
            </button>
          </div>
        </div>
      </div>

      {/* Primary Academic Navigation (Desktop) */}
      <div className="w-full px-4 sm:px-6 lg:px-8 hidden md:block">
        <nav className="flex items-center justify-between h-11 overflow-x-auto gap-1">
          <div className="flex items-center gap-0.5">
            <Link href={tenantUrl('/')} className={bottomNavLinkClass}>
              Home
            </Link>

            {/* Authorities Dropdown */}
            <div className="relative group">
              <Link href={tenantUrl('/authorities')} className={dropdownTriggerClass}>
                Authorities
              </Link>
              <div className="absolute top-full left-0 hidden group-hover:block pt-1 z-50">
                <div className="flex flex-col min-w-44 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-800 shadow-md py-1">
                  {designations && designations.length > 0 ? (
                    designations.map((d) => (
                      <Link
                        key={d.id}
                        href={tenantUrl(`/authorities/${d.slug || d.id}`)}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {d.title || d.name}
                      </Link>
                    ))
                  ) : (
                    <span className="px-3 py-1.5 text-slate-400 text-xs italic">
                      No designations
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* About Dropdown */}
            <div className="relative group">
              <Link href={tenantUrl('/about')} className={dropdownTriggerClass}>
                About
              </Link>
              <div className="absolute top-full left-0 hidden group-hover:block pt-1 z-50">
                <div className="flex flex-col min-w-44 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-800 shadow-md py-1">
                  <Link
                    href={tenantUrl('/about')}
                    className="px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Overview &amp; Campus
                  </Link>
                  <Link
                    href={tenantUrl('/facilities')}
                    className="px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Campus Facilities
                  </Link>
                  <Link
                    href={tenantUrl('/achievements')}
                    className="px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Achievements
                  </Link>
                  <Link
                    href={tenantUrl('/recognitions')}
                    className="px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Accreditations
                  </Link>
                </div>
              </div>
            </div>

            {/* Classes Dropdown */}
            <div className="relative group">
              <Link href={tenantUrl('/classes')} className={dropdownTriggerClass}>
                Classes
              </Link>
              <div className="absolute top-full left-0 hidden group-hover:block pt-1 z-50">
                <div className="flex flex-col min-w-44 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-800 shadow-md py-1">
                  {classes && classes.length > 0 ? (
                    classes.map((c) => (
                      <Link
                        key={c.id || c}
                        href={tenantUrl(`/classes/${c.code || c.id || c}`)}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {c.name || c}
                      </Link>
                    ))
                  ) : (
                    <span className="px-3 py-1.5 text-slate-400 text-xs italic">
                      No classes registered
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Clubs Dropdown */}
            <div className="relative group">
              <Link href={tenantUrl('/clubs')} className={dropdownTriggerClass}>
                Clubs
              </Link>
              <div className="absolute top-full left-0 hidden group-hover:block pt-1 z-50">
                <div className="flex flex-col min-w-44 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-800 shadow-md py-1">
                  {clubs && clubs.length > 0 ? (
                    clubs.map((cl) => (
                      <Link
                        key={cl.id || cl}
                        href={tenantUrl(`/clubs/${cl.slug || cl.id || cl}`)}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {cl.name || cl}
                      </Link>
                    ))
                  ) : (
                    <span className="px-3 py-1.5 text-slate-400 text-xs italic">
                      No clubs found
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link href={tenantUrl('/teachers')} className={bottomNavLinkClass}>
              Faculty
            </Link>
            <Link href={tenantUrl('/staffs')} className={bottomNavLinkClass}>
              Staff
            </Link>
            <Link href={tenantUrl('/notices')} className={bottomNavLinkClass}>
              Notices
            </Link>
            <Link href={tenantUrl('/events')} className={bottomNavLinkClass}>
              Events
            </Link>
            <Link href={tenantUrl('/news')} className={bottomNavLinkClass}>
              News
            </Link>
            <Link href={tenantUrl('/results')} className={bottomNavLinkClass}>
              Results
            </Link>
            <Link href={tenantUrl('/admission')} className={bottomNavLinkClass}>
              Admission
            </Link>
            <Link href={tenantUrl('/contact')} className={bottomNavLinkClass}>
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={tenantUrl('/apply')}
              className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
            >
              Apply Online
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
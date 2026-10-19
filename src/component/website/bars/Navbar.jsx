'use client';

import React, { useContext, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Navbar = () => {
  const {
    website,
    departments,
    clubs,
    sidebar,
    setSidebar,
    websiteSettings,
    tenantUrl,
    isDark,
    toggleTheme,
    primaryColor,
  } = useContext(TenantWebsiteContext);

  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [deptOpen, setDeptOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [clubsOpen, setClubsOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const deptRef = useRef(null);
  const aboutRef = useRef(null);
  const clubsRef = useRef(null);

  // Close dropdowns on route changes during render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setDeptOpen(false);
    setAboutOpen(false);
    setClubsOpen(false);
  }

  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  
  // Use logo strictly from website table with no fallback
  const rawLogo = website?.logo;
  const logoUrl =
    typeof rawLogo === 'string' &&
    rawLogo.trim() !== '' &&
    rawLogo.trim().toLowerCase() !== 'null' &&
    rawLogo.trim().toLowerCase() !== 'undefined'
      ? rawLogo.trim()
      : null;


  // Primary brand background color
  const navBg = primaryColor || website?.primary_color || '#A2AB73';

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deptRef.current && !deptRef.current.contains(event.target)) {
        setDeptOpen(false);
      }
      if (aboutRef.current && !aboutRef.current.contains(event.target)) {
        setAboutOpen(false);
      }
      if (clubsRef.current && !clubsRef.current.contains(event.target)) {
        setClubsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navLinkClass = (path) => {
    const isActive = pathname === path || pathname === tenantUrl(path);
    return `text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap flex items-center gap-1 ${
      isActive
        ? 'bg-white/25 text-white shadow-xs'
        : 'text-white/90 hover:text-white hover:bg-white/15'
    }`;
  };

  const dropdownTriggerClass = (isOpen) =>
    `text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap flex items-center gap-1 cursor-pointer ${
      isOpen
        ? 'bg-white/25 text-white shadow-xs'
        : 'text-white/90 hover:text-white hover:bg-white/15'
    }`;

  return (
    <header
      className="w-full text-white sticky top-0 z-40 transition-colors shadow-md select-none"
      style={{ backgroundColor: navBg }}
    >
      {/* Upper Navigation Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 border-b border-white/15">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Brand & Institution Info */}
          <Link href={tenantUrl('/')} className="flex items-center gap-2.5 min-w-0 group">
            {logoUrl && !logoError && (
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-white/30 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={schoolName}
                  className="w-full h-full object-contain p-0.5"
                  onError={() => setLogoError(true)}
                />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-bold text-white tracking-tight truncate group-hover:text-white/90 transition-colors">
                {schoolName}
              </span>
            </div>
          </Link>

          {/* Right Action Suite: Mode, Portals & Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-white/30 text-white/95 hover:bg-white/15 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            >
              <span>{isDark ? '☀ Light' : '☾ Dark'}</span>
            </button>

            {/* Desktop Portal Links */}
            <div className="hidden lg:flex items-center gap-2 pl-1">
              <Link
                href={tenantUrl('/auth/student')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 transition-all"
              >
                Student Portal
              </Link>
              <Link
                href={tenantUrl('/auth/access')}
                className="px-3 py-1 rounded-md bg-white hover:bg-white/90 text-slate-900 font-bold text-xs transition-all shadow-xs"
              >
                Login
              </Link>
            </div>

            {/* Mobile Navigation Drawer Trigger */}
            <button
              type="button"
              onClick={() => setSidebar(!sidebar)}
              className="md:hidden px-3 py-1 rounded-md border border-white/30 text-xs font-bold text-white hover:bg-white/15 transition-all cursor-pointer flex items-center gap-1"
              aria-label="Toggle Navigation Menu"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Academic Navigation (Desktop) */}
      <div className="w-full px-4 sm:px-6 lg:px-8 hidden md:block relative">
        <nav className="flex items-center justify-between h-11 gap-1.5 relative">
          <div className="flex items-center gap-1 h-full">
            <Link href={tenantUrl('/')} className={navLinkClass('/')}>
              Home
            </Link>

            {/* About Dropdown (Only Valid, Verified Working Routes) */}
            <div
              className="relative h-full flex items-center group"
              ref={aboutRef}
              onMouseEnter={() => setAboutOpen(true)}
              onMouseLeave={() => setAboutOpen(false)}
            >
              <button
                type="button"
                onClick={() => setAboutOpen(!aboutOpen)}
                className={dropdownTriggerClass(aboutOpen)}
                aria-haspopup="true"
                aria-expanded={aboutOpen}
              >
                <span>About</span>
                <span className="text-[9px] opacity-80">▾</span>
              </button>

              {aboutOpen && (
                <div className="absolute top-full left-0 z-50 pt-1">
                  <div className="flex flex-col min-w-48 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 overflow-hidden">
                    <Link
                      href={tenantUrl('/about')}
                      className="px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                    >
                      <span>Overview &amp; Profile</span>
                      <span className="text-[10px] text-slate-400">&rarr;</span>
                    </Link>
                    <Link
                      href={tenantUrl('/about/mission')}
                      className="px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Mission &amp; Vision
                    </Link>
                    <Link
                      href={tenantUrl('/about/history')}
                      className="px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      History &amp; Heritage
                    </Link>
                    <Link
                      href={tenantUrl('/facilities')}
                      className="px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Campus Facilities
                    </Link>
                    <Link
                      href={tenantUrl('/alumni')}
                      className="px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Alumni Network
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* DEPARTMENT POPUP BOX (Instead of Class, Show Department, Then Appear Department Box) */}
            <div
              className="relative h-full flex items-center group"
              ref={deptRef}
              onMouseEnter={() => setDeptOpen(true)}
              onMouseLeave={() => setDeptOpen(false)}
            >
              <button
                type="button"
                onClick={() => setDeptOpen(!deptOpen)}
                className={dropdownTriggerClass(deptOpen)}
                aria-haspopup="true"
                aria-expanded={deptOpen}
              >
                <span>Department</span>
                <span className="text-[9px] opacity-80">▾</span>
              </button>

              {/* Department Box */}
              {deptOpen && (
                <div className="absolute top-full left-0 z-50 pt-1">
                  <div
                    id="department-box"
                    className="w-96 sm:w-[450px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                  >
                    
                    <div className="p-2 max-h-72 overflow-y-auto space-y-1">
                      {departments && departments.length > 0 ? (
                        departments.map((d) => (
                          <Link
                            key={d.id}
                            href={tenantUrl(`/departments/${d.slug || d.id}`)}
                            className="group block p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                  {d.name}
                                </span>
                                {d.code && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                                    {d.code}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
                                {d.class_count || (d.classes?.length || 0)} classes &rarr;
                              </span>
                            </div>

                            {d.motto && (
                              <p className="text-[11px] italic text-blue-700/90 dark:text-blue-400/90 truncate mt-0.5">
                                &ldquo;{d.motto}&rdquo;
                              </p>
                            )}

                            {d.summary && !d.motto && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {d.summary}
                              </p>
                            )}
                          </Link>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          <p>No academic departments currently listed.</p>
                          <Link
                            href={tenantUrl('/departments')}
                            className="mt-1.5 inline-block text-blue-600 dark:text-blue-400 font-semibold underline"
                          >
                            View Departments Directory
                          </Link>
                        </div>
                      )}
                    </div>

                    
                  </div>
                </div>
              )}
            </div>

            {/* Clubs Dropdown */}
            <div
              className="relative h-full flex items-center group"
              ref={clubsRef}
              onMouseEnter={() => setClubsOpen(true)}
              onMouseLeave={() => setClubsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setClubsOpen(!clubsOpen)}
                className={dropdownTriggerClass(clubsOpen)}
                aria-haspopup="true"
                aria-expanded={clubsOpen}
              >
                <span>Clubs</span>
                <span className="text-[9px] opacity-80">▾</span>
              </button>

              {clubsOpen && (
                <div className="absolute top-full left-0 z-50 pt-1">
                  <div className="flex flex-col min-w-48 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1.5">
                    <Link
                      href={tenantUrl('/clubs')}
                      className="px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      All Clubs &amp; Societies &rarr;
                    </Link>
                    {clubs && clubs.length > 0 ? (
                      clubs.map((cl) => (
                        <Link
                          key={cl.id || cl}
                          href={tenantUrl(`/clubs/${cl.slug || cl.id || cl}`)}
                          className="px-3.5 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {cl.name || cl}
                        </Link>
                      ))
                    ) : (
                      <span className="px-3.5 py-1.5 text-slate-400 text-xs italic">
                        No clubs found
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Navigation Links (All Verified Active Routes) */}
            <Link href={tenantUrl('/teachers')} className={navLinkClass('/teachers')}>
              Faculty
            </Link>
            <Link href={tenantUrl('/notices')} className={navLinkClass('/notices')}>
              Notices
            </Link>
            <Link href={tenantUrl('/events')} className={navLinkClass('/events')}>
              Events
            </Link>
            <Link href={tenantUrl('/news')} className={navLinkClass('/news')}>
              News
            </Link>
            <Link href={tenantUrl('/results')} className={navLinkClass('/results')}>
              Results
            </Link>
            <Link href={tenantUrl('/admission')} className={navLinkClass('/admission')}>
              Admission
            </Link>
            <Link href={tenantUrl('/contact')} className={navLinkClass('/contact')}>
              Contact
            </Link>
          </div>

          {/* Right Action Button: Pay Online & Apply Online */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={tenantUrl('/pay')}
              className="px-3 py-1 rounded-md border border-amber-300/60 bg-amber-400/20 hover:bg-amber-400 text-white hover:text-slate-900 font-bold text-xs transition-all shadow-xs"
            >
              Pay Online
            </Link>
            <Link
              href={tenantUrl('/admission/apply')}
              className="px-3 py-1 rounded-md border border-white/40 bg-white/15 hover:bg-white text-white hover:text-slate-900 font-bold text-xs transition-all shadow-xs"
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
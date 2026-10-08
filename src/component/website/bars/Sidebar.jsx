'use client';

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Sidebar = () => {
  const {
    sidebar,
    setSidebar,
    website,
    classes,
    clubs,
    designations,
    websiteSettings,
    tenantUrl,
    theme,
    isDark,
    toggleTheme,
  } = useContext(TenantWebsiteContext);

  const pathname = usePathname();
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const closeSidebar = () => setSidebar(false);

  const navItemClass = (path) => {
    const active = pathname === path || pathname === tenantUrl(path);
    return `w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
      active
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border-l-2 border-slate-900 dark:border-white'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
    }`;
  };

  const accordionHeaderClass =
    'w-full text-left px-3 py-2 rounded text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors cursor-pointer';

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity duration-200 md:hidden ${
          sidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 z-50 flex flex-col justify-between shadow-xl border-l border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out md:hidden ${
          sidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Campus Mobile Navigation"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {schoolName}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Campus Navigation
            </span>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="px-2 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Controls: Mode Row */}
          <div className="p-2 mb-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Display Theme</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
            >
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <Link href={tenantUrl('/')} onClick={closeSidebar} className={navItemClass('/')}>
            <span>Home</span>
          </Link>

          <Link href={tenantUrl('/notices')} onClick={closeSidebar} className={navItemClass('/notices')}>
            <span>Notices &amp; Circulars</span>
          </Link>

          <Link href={tenantUrl('/events')} onClick={closeSidebar} className={navItemClass('/events')}>
            <span>Events</span>
          </Link>

          <Link href={tenantUrl('/news')} onClick={closeSidebar} className={navItemClass('/news')}>
            <span>News Hub</span>
          </Link>

          <Link href={tenantUrl('/teachers')} onClick={closeSidebar} className={navItemClass('/teachers')}>
            <span>Faculty Members</span>
          </Link>

          <Link href={tenantUrl('/staffs')} onClick={closeSidebar} className={navItemClass('/staffs')}>
            <span>Staff Roster</span>
          </Link>

          {/* Authorities Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('authorities')}
              className={accordionHeaderClass}
            >
              <span>Authorities</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {openSection === 'authorities' ? '▲' : '▼'}
              </span>
            </button>
            {openSection === 'authorities' && (
              <div className="pl-3 py-1 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-2">
                <Link
                  href={tenantUrl('/authorities')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  All Authorities
                </Link>
                {designations?.map((d) => (
                  <Link
                    key={d.id}
                    href={tenantUrl(`/authorities/${d.slug || d.id}`)}
                    onClick={closeSidebar}
                    className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    {d.title || d.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Classes Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('classes')}
              className={accordionHeaderClass}
            >
              <span>Classes</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {openSection === 'classes' ? '▲' : '▼'}
              </span>
            </button>
            {openSection === 'classes' && (
              <div className="pl-3 py-1 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-2 max-h-40 overflow-y-auto">
                <Link
                  href={tenantUrl('/classes')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  All Classes
                </Link>
                {classes?.map((c) => (
                  <Link
                    key={c.id || c}
                    href={tenantUrl(`/classes/${c.code || c.id || c}`)}
                    onClick={closeSidebar}
                    className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    {c.name || c}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Clubs Accordion */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('clubs')}
              className={accordionHeaderClass}
            >
              <span>Clubs &amp; Societies</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {openSection === 'clubs' ? '▲' : '▼'}
              </span>
            </button>
            {openSection === 'clubs' && (
              <div className="pl-3 py-1 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-2 max-h-40 overflow-y-auto">
                <Link
                  href={tenantUrl('/clubs')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  All Clubs
                </Link>
                {clubs?.map((cl) => (
                  <Link
                    key={cl.id || cl}
                    href={tenantUrl(`/clubs/${cl.slug || cl.id || cl}`)}
                    onClick={closeSidebar}
                    className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    {cl.name || cl}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href={tenantUrl('/admission')} onClick={closeSidebar} className={navItemClass('/admission')}>
            <span>Admission Circular</span>
          </Link>

          <Link href={tenantUrl('/apply')} onClick={closeSidebar} className={navItemClass('/apply')}>
            <span>Apply Online</span>
          </Link>

          <Link href={tenantUrl('/student-fees')} onClick={closeSidebar} className={navItemClass('/student-fees')}>
            <span>Tuition Fees Schedule</span>
          </Link>

          <Link href={tenantUrl('/results')} onClick={closeSidebar} className={navItemClass('/results')}>
            <span>Academic Results</span>
          </Link>

          <Link href={tenantUrl('/gallery')} onClick={closeSidebar} className={navItemClass('/gallery')}>
            <span>Campus Gallery</span>
          </Link>

          <Link href={tenantUrl('/contact')} onClick={closeSidebar} className={navItemClass('/contact')}>
            <span>Contact &amp; Location</span>
          </Link>

          {/* Document Verification Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="px-3 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Verification Hub
            </span>
            <div className="mt-1 space-y-0.5">
              <Link
                href={tenantUrl('/verify-student')}
                onClick={closeSidebar}
                className="block px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Verify Student Enrollment
              </Link>
              <Link
                href={tenantUrl('/verify-id-card')}
                onClick={closeSidebar}
                className="block px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Verify Student ID Card
              </Link>
              <Link
                href={tenantUrl('/verify-testimonial')}
                onClick={closeSidebar}
                className="block px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Verify Testimonial
              </Link>
              <Link
                href={tenantUrl('/verify-tc')}
                onClick={closeSidebar}
                className="block px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Verify Transfer Certificate
              </Link>
            </div>
          </div>
        </div>

        {/* Drawer Footer: Portals */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 bg-slate-50 dark:bg-slate-900/80">
          <Link
            href={tenantUrl('/auth/student')}
            onClick={closeSidebar}
            className="w-full text-center block px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 font-medium text-xs transition-colors"
          >
            Student Portal
          </Link>
          <Link
            href={tenantUrl('/auth/access')}
            onClick={closeSidebar}
            className="w-full text-center block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs transition-colors"
          >
            Staff &amp; Teacher Portal
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
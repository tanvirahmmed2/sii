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
    departments,
    clubs,
    websiteSettings,
    tenantUrl,
    isDark,
    toggleTheme,
    primaryColor,
  } = useContext(TenantWebsiteContext);

  const pathname = usePathname();
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const [openSection, setOpenSection] = useState('departments');

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const closeSidebar = () => setSidebar(false);

  const navItemClass = (path) => {
    const active = pathname === path || pathname === tenantUrl(path);
    return `w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
      active
        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
    }`;
  };

  const accordionHeaderClass =
    'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer';

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
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 z-50 flex flex-col justify-between shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out md:hidden ${
          sidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Campus Mobile Navigation"
      >
        {/* Drawer Header */}
        <div
          className="p-4 border-b border-white/20 text-white flex items-center justify-between"
          style={{ backgroundColor: primaryColor || website?.primary_color || '#1e3a8a' }}
        >
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-sm font-bold text-white truncate">
              {schoolName}
            </span>
            <span className="text-[10px] text-white/80 uppercase tracking-wider font-mono">
              Academic Navigation
            </span>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="px-2.5 py-1 text-xs font-bold rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Controls: Mode Row */}
          <div className="p-2 mb-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Display Theme</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
            >
              {isDark ? '☀ Light Mode' : '☾ Dark Mode'}
            </button>
          </div>

          <Link href={tenantUrl('/')} onClick={closeSidebar} className={navItemClass('/')}>
            <span>Home</span>
          </Link>

          {/* Departments Accordion (Replacing Classes with Department Box / Accordion) */}
          <div className="rounded-lg bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 p-1">
            <button
              type="button"
              onClick={() => toggleSection('departments')}
              className={accordionHeaderClass}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                <span>Academic Departments</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {openSection === 'departments' ? '▲' : '▼'}
              </span>
            </button>
            {openSection === 'departments' && (
              <div className="pl-3 py-1 space-y-0.5 border-l-2 border-blue-600 ml-2 mt-1 max-h-48 overflow-y-auto">
                <Link
                  href={tenantUrl('/departments')}
                  onClick={closeSidebar}
                  className="block px-2 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  All Departments &rarr;
                </Link>
                {departments && departments.length > 0 ? (
                  departments.map((d) => (
                    <Link
                      key={d.id}
                      href={tenantUrl(`/departments/${d.slug || d.id}`)}
                      onClick={closeSidebar}
                      className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{d.name}</span>
                        {d.code && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {d.code}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <span className="block px-2 py-1 text-xs text-slate-400 italic">
                    No departments loaded
                  </span>
                )}
              </div>
            )}
          </div>

          {/* About Us Submenu */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('about')}
              className={accordionHeaderClass}
            >
              <span>About Institution</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {openSection === 'about' ? '▲' : '▼'}
              </span>
            </button>
            {openSection === 'about' && (
              <div className="pl-3 py-1 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-2">
                <Link
                  href={tenantUrl('/about')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Overview &amp; Campus
                </Link>
                <Link
                  href={tenantUrl('/about/mission')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Mission &amp; Vision
                </Link>
                <Link
                  href={tenantUrl('/about/history')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  History &amp; Heritage
                </Link>
                <Link
                  href={tenantUrl('/facilities')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Campus Facilities
                </Link>
                <Link
                  href={tenantUrl('/alumni')}
                  onClick={closeSidebar}
                  className="block px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Alumni Network
                </Link>
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
                  className="block px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  All Clubs &rarr;
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

          <Link href={tenantUrl('/teachers')} onClick={closeSidebar} className={navItemClass('/teachers')}>
            <span>Faculty Members</span>
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

          <Link href={tenantUrl('/admission')} onClick={closeSidebar} className={navItemClass('/admission')}>
            <span>Admission Circular</span>
          </Link>

          <Link href={tenantUrl('/admission/apply')} onClick={closeSidebar} className={navItemClass('/admission/apply')}>
            <span className="font-bold text-blue-600 dark:text-blue-400">Apply Online</span>
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
            <span className="px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
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
            className="w-full text-center block px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
          >
            Student Portal
          </Link>
          <Link
            href={tenantUrl('/auth/access')}
            onClick={closeSidebar}
            className="w-full text-center block px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors"
          >
            Staff &amp; Teacher Portal
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
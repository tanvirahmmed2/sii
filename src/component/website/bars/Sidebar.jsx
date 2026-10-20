'use client';

import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const linkGroups = [
  {
    title: 'Academic',
    links: [
      { label: 'Home', path: '/' },
      { label: 'About', path: '/about' },
      { label: 'Mission', path: '/about/mission' },
      { label: 'History', path: '/about/history' },
      { label: 'Departments', path: '/departments' },
      { label: 'Clubs', path: '/clubs' },
      { label: 'Faculty', path: '/teachers' },
      { label: 'Classes', path: '/classes' },
      { label: 'Facilities', path: '/facilities' },
      { label: 'Hostels', path: '/facilities/hostels' },
      { label: 'Classrooms', path: '/facilities/classrooms' },
      { label: 'Alumni', path: '/alumni' },
      { label: 'Collaborations', path: '/collaborations' },
    ],
  },
  {
    title: 'Media',
    links: [
      { label: 'Notices', path: '/notices' },
      { label: 'Events', path: '/events' },
      { label: 'News', path: '/news' },
      { label: 'Awards', path: '/awards' },
      { label: 'Announcements', path: '/club-news' },
      { label: 'Gallery', path: '/gallery' },
    ],
  },
  {
    title: 'Admissions',
    links: [
      { label: 'Admission', path: '/admission' },
      { label: 'Fees', path: '/student-fees' },
      { label: 'Results', path: '/results' },
    ],
  },
  {
    title: 'Verification',
    links: [
      { label: 'Enrollment', path: '/verify-student' },
      { label: 'ID', path: '/verify-id-card' },
      { label: 'Testimonials', path: '/verify-testimonial' },
      { label: 'Transfer', path: '/verify-tc' },
    ],
  },
  {
    title: 'Info',
    links: [
      { label: 'Policies', path: '/policies' },
      { label: 'FAQs', path: '/faqs' },
      { label: 'Contact', path: '/contact' },
    ],
  },
];

const Sidebar = () => {
  const {
    sidebar,
    setSidebar,
    website,
    websiteSettings,
    tenantUrl,
    primaryColor,
  } = useContext(TenantWebsiteContext);

  const pathname = usePathname();
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const navBg = primaryColor || website?.primary_color || '#A2AB73';

  const closeSidebar = () => setSidebar(false);

  // Close on Escape key and prevent background body scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeSidebar();
    };
    if (sidebar) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [sidebar]);

  return (
    <AnimatePresence>
      {sidebar && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={closeSidebar}
            aria-hidden="true"
          />

          {/* Simple Drawer without icons */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative w-76 max-w-[85vw] h-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col justify-between shadow-2xl border-l border-slate-200 dark:border-slate-800 z-10"
            aria-label="Mobile Navigation"
          >
            {/* Header */}
            <div
              className="px-5 py-4 text-white flex items-center justify-between shadow-xs"
              style={{ backgroundColor: navBg }}
            >
              <div className="min-w-0 pr-2">
                <h2 className="text-sm font-serif font-medium tracking-tight truncate text-white">
                  {schoolName}
                </h2>
                <span className="text-[10px] uppercase tracking-wider text-white/80 block font-mono">
                  Menu
                </span>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions (Pay / Apply) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <Link
                href={tenantUrl('/pay')}
                onClick={closeSidebar}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-primary hover:text-primary transition-all text-center shadow-2xs"
              >
                Pay
              </Link>
              <Link
                href={tenantUrl('/admission/apply')}
                onClick={closeSidebar}
                className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all text-center shadow-2xs"
              >
                Apply
              </Link>
            </div>

            {/* Main Navigation with All Categorized Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {linkGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 block">
                    {group.title}
                  </span>
                  <div className="space-y-0.5">
                    {group.links.map((item) => {
                      const isActive = pathname === item.path || pathname === tenantUrl(item.path);
                      return (
                        <Link
                          key={item.path}
                          href={tenantUrl(item.path)}
                          onClick={closeSidebar}
                          className={`block px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-primary/10 text-primary-dark dark:text-primary-light font-semibold border-l-3 border-primary'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer with Portals (Mode/Theme option removed) */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={tenantUrl('/auth/student')}
                  onClick={closeSidebar}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary text-xs font-semibold transition-all shadow-2xs text-center"
                >
                  Student
                </Link>
                <Link
                  href={tenantUrl('/auth/access')}
                  onClick={closeSidebar}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-all shadow-2xs text-center"
                >
                  Staff
                </Link>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
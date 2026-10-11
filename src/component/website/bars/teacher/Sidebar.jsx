'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Sidebar = () => {
  const pathname = usePathname();
  const { teacherSidebar, setTeacherSidebar, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubDropdownOpen, setClubDropdownOpen] = useState(false);

  useEffect(() => {
    async function checkClubAdmin() {
      try {
        const res = await fetch(getApiEndpoint('teacher/clubs'));
        const data = await res.json();
        if (data?.success && (data?.payload?.isClubAdmin || data?.paylod?.isClubAdmin)) {
          setIsClubAdmin(true);
        }
      } catch (err) {
        console.error('Error checking club admin status:', err);
      }
    }
    checkClubAdmin();
  }, [getApiEndpoint]);

  useEffect(() => {
    if (pathname.includes('/teacher/clubs')) {
      setClubDropdownOpen(true);
    }
  }, [pathname]);

  const teacherLinks = [
    { label: 'Overview Dashboard', href: '/teacher' },
    { label: 'Classrooms & Learning', href: '/teacher/classrooms' },
    { label: 'Exam Schedules', href: '/teacher/exams' },
    { label: 'Class Schedules', href: '/teacher/schedule' },
    { label: 'Attendance Records', href: '/teacher/attendance' },
    { label: 'Take Attendance', href: '/teacher/attendance/record' },
    { label: 'Assigned Subjects', href: '/teacher/subjects' },
    { label: 'Marks & Results Entry', href: '/teacher/marks' },
    { label: 'Leave Applications', href: '/teacher/leaves' },
    { label: 'Salary Ledger', href: '/teacher/salary' },
    { label: 'Faculty Profile', href: '/teacher/profile' },
  ];

  const clubSubLinks = [
    { label: 'Club Overview', href: '/teacher/clubs' },
    { label: 'Club Notices', href: '/teacher/clubs/notice' },
    { label: 'Members & Roles', href: '/teacher/clubs/members' },
    { label: 'Club News', href: '/teacher/clubs/news' },
  ];

  return (
    <>
      {teacherSidebar && (
        <div
          className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setTeacherSidebar(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          teacherSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pt-2 pb-1">
            Faculty Portal Navigation
          </p>

          <nav className="flex flex-col space-y-0.5">
            {teacherLinks.map((link) => {
              const target = tenantUrl(link.href);
              const isActive = pathname === target || pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={target}
                  onClick={() => setTeacherSidebar(false)}
                  className={`px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Club Administration if moderator */}
            {isClubAdmin && (
              <div className="flex flex-col space-y-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => setClubDropdownOpen(!clubDropdownOpen)}
                  className="flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <span>Club Moderation</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {clubDropdownOpen ? '−' : '+'}
                  </span>
                </button>

                {clubDropdownOpen && (
                  <div className="flex flex-col space-y-0.5 pl-3 border-l border-slate-200 dark:border-slate-800 ml-2 py-0.5">
                    {clubSubLinks.map((sub) => {
                      const target = tenantUrl(sub.href);
                      const isSubActive = pathname === target || pathname === sub.href;

                      return (
                        <Link
                          key={sub.href}
                          href={target}
                          onClick={() => setTeacherSidebar(false)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            isSubActive
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <Link
            href={tenantUrl('/')}
            className="w-full block text-center px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            Return to Campus Portal
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
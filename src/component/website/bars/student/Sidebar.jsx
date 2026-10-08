'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Sidebar = () => {
  const pathname = usePathname();
  const { studentSidebar, setStudentSidebar, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [isClubMember, setIsClubMember] = useState(false);

  useEffect(() => {
    async function checkClubMember() {
      try {
        const res = await fetch(getApiEndpoint('student/clubs'));
        const data = await res.json();
        if (data?.success && (data?.payload?.isClubMember || data?.paylod?.isClubMember)) {
          setIsClubMember(true);
        }
      } catch (err) {
        console.error('Error checking club membership status:', err);
      }
    }
    checkClubMember();
  }, [getApiEndpoint]);

  const studentLinks = [
    { label: 'Overview Dashboard', href: '/student' },
    { label: 'Class Routine', href: '/student/routine' },
    { label: 'Attendance Records', href: '/student/attendance' },
    { label: 'Subjects & Syllabus', href: '/student/subjects' },
    { label: 'Exam Schedules', href: '/student/exams' },
    { label: 'Exam Admit Cards', href: '/student/cards' },
    { label: 'Student ID Card', href: '/student/id-card' },
    { label: 'Institutional Testimonial', href: '/student/testimonial' },
    { label: 'Academic Results & Marks', href: '/student/results' },
    { label: 'Tuition Fees & Invoices', href: '/student/fees' },
    { label: 'Hostel Accommodation', href: '/student/hostels' },
    { label: 'Campus Events', href: '/student/events' },
    ...(isClubMember ? [{ label: 'Club Dashboard', href: '/student/clubs' }] : []),
    { label: 'Student Profile', href: '/student/profile' },
  ];

  return (
    <>
      {studentSidebar && (
        <div
          className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setStudentSidebar(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          studentSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pt-2 pb-1">
            Student Portal Navigation
          </p>
          <nav className="flex flex-col space-y-0.5">
            {studentLinks.map((link) => {
              const target = tenantUrl(link.href);
              const isActive = pathname === target || pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={target}
                  onClick={() => setStudentSidebar(false)}
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
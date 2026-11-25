'use client';
import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
const Sidebar = () => {
    const pathname = usePathname();
    const { studentSidebar, setStudentSidebar, tenantUrl, getApiEndpoint } = useContext<any>(TenantWebsiteContext);
    const [isClubMember, setIsClubMember] = useState<any>(false);
    useEffect(() => {
        async function checkClubMember() {
            try {
                const res = await fetch(getApiEndpoint('student/clubs'));
                const data = await res.json();
                if (data?.success && (data?.payload?.isClubMember || data?.paylod?.isClubMember)) {
                    setIsClubMember(true);
                }
            }
            catch (err: any) {
                console.error('Error checking club membership status:', err);
            }
        }
        checkClubMember();
    }, [getApiEndpoint]);
    const studentLinks = [
        { label: 'Dashboard', href: '/student' },
        { label: 'Classrooms', href: '/student/classrooms' },
        { label: 'Assignments', href: '/student/assignments' },
        { label: 'Routine', href: '/student/routine' },
        { label: 'Attendance', href: '/student/attendance' },
        { label: 'Subjects', href: '/student/subjects' },
        { label: 'Exams', href: '/student/exams' },
        { label: 'Cards', href: '/student/cards' },
        { label: 'IDCard', href: '/student/id-card' },
        { label: 'Receipts', href: '/student/receipts' },
        { label: 'Testimonial', href: '/student/testimonial' },
        { label: 'Certificates', href: '/student/certificates' },
        { label: 'TC', href: '/student/tc' },
        { label: 'Results', href: '/student/results' },
        { label: 'Fees', href: '/student/fees' },
        { label: 'Hostel', href: '/student/residence' },
        { label: 'Clubs', href: '/student/clubs' },
        { label: 'Events', href: '/student/events' },
        { label: 'Profile', href: '/student/profile' },
    ];
    return (<>
      {studentSidebar && (<div className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity" onClick={() => setStudentSidebar(false)}/>)}

      <aside className={`fixed md:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${studentSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pt-2 pb-1">
            Student
          </p>
          <nav className="flex flex-col space-y-0.5">
            {studentLinks.map((link: any) => {
            const target = tenantUrl(link.href);
            const isActive = pathname === target || pathname === link.href;
            return (<Link key={link.href} href={target} onClick={() => setStudentSidebar(false)} className={`px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'}`}>
                  <span>{link.label}</span>
                </Link>);
        })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <Link href={tenantUrl('/')} className="w-full block text-center px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors">
            Portal
          </Link>
        </div>
      </aside>
    </>);
};
export default Sidebar;

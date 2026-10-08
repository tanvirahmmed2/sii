'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Back from 'src/component/button/Back';

const Sidebar = () => {
  const pathname = usePathname();
  const { staffSidebar, setStaffSidebar, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(getApiEndpoint('staff/me'));
        if (res.ok) {
          const data = await res.json();
          setRole(data.paylod?.staff?.role || data.payload?.staff?.role || null);
        }
      } catch (err) {
        console.error('Failed to load role in sidebar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [getApiEndpoint]);

  const getLinks = () => {
    const base = [
      { label: 'Portal Home', href: tenantUrl('/staff') }
    ];

    let roleLinks = [];
    if (role === 'cashier') {
      roleLinks = [
        { label: 'Admission Fees', href: tenantUrl('/staff/cashier/admission-fee') },
        { label: 'Monthly Fees', href: tenantUrl('/staff/cashier/monthly-fee') },
        { label: 'Exam Fees', href: tenantUrl('/staff/cashier/exam-fee') },
        { label: 'Payroll Desk', href: tenantUrl('/staff/cashier/salary') },
        { label: 'Transaction Desk', href: tenantUrl('/staff/cashier/transactions') },
      ];
    } else if (role === 'registrar') {
      roleLinks = [
        { label: 'Admissions Registry', href: tenantUrl('/staff/registrar/admissions') },
        { label: 'Documents Hub', href: tenantUrl('/staff/registrar/documents') },
        { label: 'Transfer Certificates', href: tenantUrl('/staff/registrar/documents/transfer-certificates') },
        { label: 'Exam Admit Cards', href: tenantUrl('/staff/registrar/documents/admit-cards') },
        { label: 'Student ID Cards', href: tenantUrl('/staff/registrar/documents/id-cards') },
        { label: 'Testimonials', href: tenantUrl('/staff/registrar/documents/testimonials') },
        { label: 'Transferred Students', href: tenantUrl('/staff/registrar/documents/transferred-students') },
        { label: 'Class Routines', href: tenantUrl('/staff/registrar/routine') },
        { label: 'Campus News', href: tenantUrl('/staff/registrar/news') },
        { label: 'Events List', href: tenantUrl('/staff/registrar/events') },
        { label: 'Create Event', href: tenantUrl('/staff/registrar/events/new') },
        { label: 'Event Participants', href: tenantUrl('/staff/registrar/events/participants') },
        { label: 'Club Announcements', href: tenantUrl('/staff/registrar/club-news') },
        { label: 'Achievements', href: tenantUrl('/staff/registrar/achievements') },
        { label: 'Notice Board', href: tenantUrl('/staff/registrar/notices') },
        { label: 'Student Attendance', href: tenantUrl('/staff/registrar/student-attendence') },
        { label: 'Leave Applications', href: tenantUrl('/staff/registrar/leaves') },
        { label: 'Hostel Applications', href: tenantUrl('/staff/registrar/hostels/applications') },
        { label: 'Hostel Management', href: tenantUrl('/staff/registrar/hostels') }
      ];
    } else {
      roleLinks = [
        { label: 'Desk Activities', href: tenantUrl('/staff') }
      ];
    }

    const commonEnd = [
      { label: 'My Profile', href: tenantUrl('/staff/profile') }
    ];

    return [
      ...base,
      ...roleLinks,
      ...commonEnd
    ];
  };

  const activeLinks = getLinks();

  return (
    <>
      {staffSidebar && (
        <div
          className="fixed inset-0 top-14 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-200"
          onClick={() => setStaffSidebar(false)}
        />
      )}

      <aside
        className={`fixed top-14 left-0 bottom-0 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col justify-between py-4 px-3 transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          staffSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-3">
          <Back />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1">
              Navigation {role ? `(${role})` : ''}
            </span>

            {loading ? (
              <div className="flex flex-col gap-1.5 px-2">
                <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
              </div>
            ) : (
              <nav className="flex flex-col gap-0.5">
                {activeLinks.map((link) => {
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setStaffSidebar(false)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                        isActive
                          ? 'bg-primary text-white font-medium'
                          : 'text-slate-700 dark:text-slate-300 font-normal hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{link.label}</span>
                      {isActive && <span className="text-[10px]">●</span>}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Link
            href={tenantUrl('/')}
            onClick={() => setStaffSidebar(false)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <span>Public Home</span>
            <span className="text-[10px]">→</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

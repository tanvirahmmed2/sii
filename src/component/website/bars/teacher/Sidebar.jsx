'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome, FiCalendar, FiClock, FiFileText, FiBook,
  FiAward, FiDollarSign, FiUsers, FiUser, FiChevronDown, FiChevronRight,
  FiGrid, FiInfo
} from 'react-icons/fi';
import { TenantWebsiteContext } from '@/component/helper/WebsiteContext';
import Back from '@/component/button/Back';

const Sidebar = () => {
  const pathname = usePathname();
  const { TeacherSidebar, setTeacherSidebar } = useContext(TenantWebsiteContext);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [clubDropdownOpen, setClubDropdownOpen] = useState(false);

  useEffect(() => {
    async function checkClubAdmin() {
      try {
        const res = await fetch('/api/teacher/clubs');
        const data = await res.json();
        if (data?.success && data?.paylod?.isClubAdmin) {
          setIsClubAdmin(true);
        }
      } catch (err) {
        console.error('Error checking club admin status:', err);
      }
    }
    checkClubAdmin();
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/teacher/clubs')) {
      setClubDropdownOpen(true);
    }
  }, [pathname]);

  const teacherLinks = [
    { label: 'Dashboard', href: '/teacher', icon: FiHome },
    { label: 'Exam Routine', href: '/teacher/exams', icon: FiCalendar },
    { label: 'Class Schedule', href: '/teacher/schedule', icon: FiClock },
    { label: 'Attendance Records', href: '/teacher/attendance', icon: FiCalendar },
    { label: 'Record Attendance', href: '/teacher/attendance/record', icon: FiFileText },
    { label: 'My Subjects', href: '/teacher/subjects', icon: FiBook },
    { label: 'Student Marks', href: '/teacher/marks', icon: FiAward },
  ];

  const clubSubLinks = [
    { label: 'Overview', href: '/teacher/clubs', icon: FiGrid },
    { label: 'Notice Info', href: '/teacher/clubs/notice', icon: FiInfo },
    { label: 'Members & Roles', href: '/teacher/clubs/members', icon: FiUsers },
    { label: 'Club News', href: '/teacher/clubs/news', icon: FiFileText },
  ];

  const remainingLinks = [
    { label: 'Leave Applications', href: '/teacher/leaves', icon: FiFileText },
    { label: 'Salary History', href: '/teacher/salary', icon: FiDollarSign },
    { label: 'My Profile', href: '/teacher/profile', icon: FiUser },
  ];

  const allLinkHrefs = [
    ...teacherLinks.map(l => l.href),
    ...remainingLinks.map(l => l.href),
    ...(isClubAdmin ? clubSubLinks.map(l => l.href) : [])
  ];

  const checkIsActive = (linkHref) => {
    if (pathname === linkHref) return true;
    if (!pathname.startsWith(linkHref + '/')) return false;
    return !allLinkHrefs.some(
      other => other !== linkHref &&
               other.length > linkHref.length &&
               (pathname === other || pathname.startsWith(other + '/'))
    );
  };

  return (
    <>
      {TeacherSidebar && (
        <div
          className="fixed inset-0 top-16 bg-secondary-dark/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-200"
          onClick={() => setTeacherSidebar(false)}
        />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-primary border-r border-secondary/20 z-40 flex flex-col justify-between py-5 px-3 transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          TeacherSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-4">
          <Back />
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider px-3 flex items-center gap-1.5 mb-1">
              Teacher Navigation
            </span>
            <nav className="flex flex-col gap-1">
              {teacherLinks.map((link) => {
                const Icon = link.icon;
                const isActive = checkIsActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setTeacherSidebar(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                      isActive
                        ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                        : 'text-white font-medium hover:text-primary hover:bg-secondary'
                    }`}
                  >
                    <Icon className={`text-base ${isActive ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* Club Admin Dropdown Menu */}
              {isClubAdmin && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setClubDropdownOpen(!clubDropdownOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
                      pathname.startsWith('/teacher/clubs')
                        ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                        : 'text-white font-medium hover:text-primary hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FiUsers className={`text-base ${pathname.startsWith('/teacher/clubs') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                      <span>Club Admin</span>
                    </div>
                    {clubDropdownOpen ? <FiChevronDown className="text-xs text-white" /> : <FiChevronRight className="text-xs text-white" />}
                  </button>

                  {/* Sub Links */}
                  {clubDropdownOpen && (
                    <div className="flex flex-col gap-1 pl-4 border-l border-secondary/30 ml-4 my-1">
                      {clubSubLinks.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = checkIsActive(sub.href);

                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setTeacherSidebar(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                              isSubActive
                                ? 'bg-secondary text-primary font-bold shadow-2xs'
                                : 'text-white font-medium hover:bg-secondary hover:text-primary'
                            }`}
                          >
                            <SubIcon className={`text-xs ${isSubActive ? 'text-primary' : 'text-white'}`} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {remainingLinks.map((link) => {
                const Icon = link.icon;
                const isActive = checkIsActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setTeacherSidebar(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                      isActive
                        ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                        : 'text-white font-medium hover:text-primary hover:bg-secondary'
                    }`}
                  >
                    <Icon className={`text-base ${isActive ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-secondary/20">
          <Link
            href="/"
            onClick={() => setTeacherSidebar(false)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-primary hover:bg-primary-light font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FiHome className="text-sm" />
            <span>Go to Home Page</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
'use client';

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const CollapsibleGroup = ({ label, isOpen, setIsOpen, prefix, links, pathname, setAdminSidebar, tenantUrl }) => {
  const isGroupActive = pathname.startsWith(prefix) || pathname.startsWith(tenantUrl(prefix));

  return (
    <div className="flex flex-col space-y-0.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
          isGroupActive
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
        }`}
      >
        <span>{label}</span>
        <span className="text-[10px] text-slate-400 font-mono">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen && (
        <div className="flex flex-col space-y-0.5 pl-3 border-l border-slate-200 dark:border-slate-800 ml-2 py-0.5">
          {links.map((link) => {
            const target = tenantUrl(link.href);
            const isActive = pathname === target || pathname === link.href;

            return (
              <Link
                key={link.href}
                href={target}
                onClick={() => setAdminSidebar(false)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const NavLinkGroup = ({ links, pathname, setAdminSidebar, tenantUrl }) => (
  <nav className="flex flex-col space-y-0.5">
    {links.map((link) => {
      const target = tenantUrl(link.href);
      const isActive = pathname === target || pathname === link.href;

      return (
        <Link
          key={link.href}
          href={target}
          onClick={() => setAdminSidebar(false)}
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
);

const Sidebar = ({ allowedModules = null, isDevAdmin = false }) => {
  const pathname = usePathname();
  const { adminSidebar, setAdminSidebar, tenantUrl } = useContext(TenantWebsiteContext);

  const isAllowed = (moduleSlug) => {
    if (isDevAdmin) return true;
    if (!allowedModules || !Array.isArray(allowedModules)) return true;
    if (!moduleSlug) return true;
    return allowedModules.includes(moduleSlug);
  };

  // Accordion open states
  const [classesOpen, setClassesOpen] = useState(pathname.includes('/staff-panel/classes'));
  const [subjectsOpen, setSubjectsOpen] = useState(pathname.includes('/staff-panel/subjects'));
  const [teachersOpen, setTeachersOpen] = useState(pathname.includes('/staff-panel/teachers'));
  const [authoritiesOpen, setAuthoritiesOpen] = useState(pathname.includes('/staff-panel/authorities'));
  const [examsOpen, setExamsOpen] = useState(pathname.includes('/staff-panel/exams'));
  const [studentsOpen, setStudentsOpen] = useState(pathname.includes('/staff-panel/students'));
  const [clubsOpen, setClubsOpen] = useState(pathname.includes('/staff-panel/clubs'));
  const [newsOpen, setNewsOpen] = useState(pathname.includes('/staff-panel/news'));
  const [achievementsOpen, setAchievementsOpen] = useState(pathname.includes('/staff-panel/achievements'));
  const [recognitionsOpen, setRecognitionsOpen] = useState(pathname.includes('/staff-panel/recognition'));
  const [eventsOpen, setEventsOpen] = useState(pathname.includes('/staff-panel/events'));
  const [historyOpen, setHistoryOpen] = useState(pathname.includes('/staff-panel/history'));
  const [hostelsOpen, setHostelsOpen] = useState(pathname.includes('/staff-panel/hostels'));
  const [staffOpen, setStaffOpen] = useState(pathname.includes('/staff-panel/staff'));
  const [documentsOpen, setDocumentsOpen] = useState(pathname.includes('/staff-panel/documents'));

  const systemLinks = [
    { label: 'Overview Dashboard', href: '/staff-panel' },
    { label: 'Staff Profile', href: '/staff-panel/profile' },
    { label: 'Login History', href: '/staff-panel/logs/login' },
    { label: 'Activity Logs', href: '/staff-panel/logs/activity' },
    { label: 'Portal Settings', href: '/staff-panel/settings' },
    { label: 'Access Control', href: '/staff-panel/access' },
    { label: 'Security & 2FA', href: '/staff-panel/security' },
    { label: 'Public Notices', href: '/staff-panel/announcements' },
  ];

  const documentLinks = [
    { label: 'Documents Hub', href: '/staff-panel/documents' },
    { label: 'Transfer Certificates', href: '/staff-panel/documents/transfer-certificates' },
    { label: 'Exam Admit Cards', href: '/staff-panel/documents/admit-cards' },
    { label: 'Student ID Cards', href: '/staff-panel/documents/id-cards' },
    { label: 'Testimonials', href: '/staff-panel/documents/testimonials' },
    { label: 'Transferred Students', href: '/staff-panel/documents/transferred-students' },
  ];

  const financeLogisticsLinks = [
    { label: 'General Finance', href: '/staff-panel/finance' },
    { label: 'Inventory & Assets', href: '/staff-panel/inventory' },
  ];

  const classLinks = [
    { label: 'Classes Roster', href: '/staff-panel/classes/class' },
    { label: 'Sections Roster', href: '/staff-panel/classes/sections' },
    { label: 'Class Routines', href: '/staff-panel/classes/routine' },
    { label: 'Syllabus Archive', href: '/staff-panel/classes/syllabus' },
  ];

  const subjectLinks = [
    { label: 'Subjects Registry', href: '/staff-panel/subjects/new' },
    { label: 'Subject Allocation', href: '/staff-panel/subjects/allocation' },
  ];

  const studentLinks = [
    { label: 'Students Directory', href: '/staff-panel/students/lists' },
    { label: 'Promote Students', href: '/staff-panel/students/promote' },
    { label: 'Demote Students', href: '/staff-panel/students/demote' },
    { label: 'Intake Applications', href: '/staff-panel/students/admissions' },
    { label: 'Admission Circulars', href: '/staff-panel/students/admissions/circulars' },
    { label: 'Student Leaves', href: '/staff-panel/students/leaves' },
    { label: 'Attendance Registry', href: '/staff-panel/students/attendance' },
    { label: 'Fees & Invoices', href: '/staff-panel/students/fees' },
    { label: 'Monthly Fee Rates', href: '/staff-panel/students/fees/monthly-rates' },
    { label: 'Exam Marks Ledger', href: '/staff-panel/students/marks' },
    { label: 'Publish Results', href: '/staff-panel/students/results' },
    { label: 'Transcripts & Cards', href: '/staff-panel/students/transcripts' },
  ];

  const teacherLinks = [
    { label: 'Add Faculty Member', href: '/staff-panel/teachers/new' },
    { label: 'Teachers Roster', href: '/staff-panel/teachers/list' },
    { label: 'Class Assignments', href: '/staff-panel/teachers/assign-classes' },
    { label: 'Attendance Registry', href: '/staff-panel/teachers/attendences' },
    { label: 'Salary Ledger', href: '/staff-panel/teachers/salary' },
    { label: 'Job Applications', href: '/staff-panel/teachers/applications' },
    { label: 'Qualifications', href: '/staff-panel/teachers/qualification' },
  ];

  const staffLinks = [
    { label: 'Add Staff Member', href: '/staff-panel/staff/new' },
    { label: 'Staff Roster', href: '/staff-panel/staff/list' },
    { label: 'Attendance Registry', href: '/staff-panel/staff/attendance' },
    { label: 'Leave Approvals', href: '/staff-panel/staff/leaves' },
    { label: 'Salary Ledger', href: '/staff-panel/staff/salary' },
  ];

  const examLinks = [
    { label: 'New Exam Schedule', href: '/staff-panel/exams/new' },
    { label: 'Current Exams', href: '/staff-panel/exams/current' },
    { label: 'Upcoming Exams', href: '/staff-panel/exams/upcoming' },
    { label: 'Previous Records', href: '/staff-panel/exams/previous' },
    { label: 'Grading Scales', href: '/staff-panel/exams/grades' },
  ];

  const hostelLinks = [
    { label: 'Hostels Directory', href: '/staff-panel/hostels' },
    { label: 'Hostel Applications', href: '/staff-panel/hostels/applications' },
    { label: 'Rooms & Beds', href: '/staff-panel/hostels/rooms' },
    { label: 'Room Allocations', href: '/staff-panel/hostels/allocations' },
    { label: 'Hostel Dues', href: '/staff-panel/hostels/fees' },
    { label: 'Hostel Provosts', href: '/staff-panel/hostels/provosts' },
  ];

  const groupHeaderStyle =
    'text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pt-3 pb-1';

  return (
    <>
      {adminSidebar && (
        <div
          className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setAdminSidebar(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-14 z-30 h-[calc(100vh-3.5rem)] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          adminSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-1">
          <p className={groupHeaderStyle}>System &amp; Administration</p>
          <NavLinkGroup
            links={systemLinks}
            pathname={pathname}
            setAdminSidebar={setAdminSidebar}
            tenantUrl={tenantUrl}
          />

          <p className={groupHeaderStyle}>Academic Structures</p>
          {isAllowed('classes') && (
            <CollapsibleGroup
              label="Classes &amp; Sections"
              isOpen={classesOpen}
              setIsOpen={setClassesOpen}
              prefix="/staff-panel/classes"
              links={classLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          {isAllowed('subjects') && (
            <CollapsibleGroup
              label="Subjects"
              isOpen={subjectsOpen}
              setIsOpen={setSubjectsOpen}
              prefix="/staff-panel/subjects"
              links={subjectLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          {isAllowed('students') && (
            <CollapsibleGroup
              label="Student Administration"
              isOpen={studentsOpen}
              setIsOpen={setStudentsOpen}
              prefix="/staff-panel/students"
              links={studentLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          {isAllowed('documents') && (
            <CollapsibleGroup
              label="Official Documents"
              isOpen={documentsOpen}
              setIsOpen={setDocumentsOpen}
              prefix="/staff-panel/documents"
              links={documentLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          {isAllowed('exams') && (
            <CollapsibleGroup
              label="Examinations"
              isOpen={examsOpen}
              setIsOpen={setExamsOpen}
              prefix="/staff-panel/exams"
              links={examLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          <p className={groupHeaderStyle}>Human Resources</p>
          {isAllowed('teachers') && (
            <CollapsibleGroup
              label="Faculty Roster"
              isOpen={teachersOpen}
              setIsOpen={setTeachersOpen}
              prefix="/staff-panel/teachers"
              links={teacherLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          {isAllowed('staff') && (
            <CollapsibleGroup
              label="Staff Roster"
              isOpen={staffOpen}
              setIsOpen={setStaffOpen}
              prefix="/staff-panel/staff"
              links={staffLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          {isAllowed('hostels') && (
            <CollapsibleGroup
              label="Hostel Facilities"
              isOpen={hostelsOpen}
              setIsOpen={setHostelsOpen}
              prefix="/staff-panel/hostels"
              links={hostelLinks}
              pathname={pathname}
              setAdminSidebar={setAdminSidebar}
              tenantUrl={tenantUrl}
            />
          )}

          <p className={groupHeaderStyle}>Finance &amp; Operations</p>
          <NavLinkGroup
            links={financeLogisticsLinks}
            pathname={pathname}
            setAdminSidebar={setAdminSidebar}
            tenantUrl={tenantUrl}
          />
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
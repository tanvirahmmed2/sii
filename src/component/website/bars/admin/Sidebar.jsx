'use client';

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome, FiShield, FiLayers, FiGrid, FiBook,
  FiUserPlus, FiUsers, FiAward, FiCalendar, FiDollarSign, FiFileText, FiUserCheck,
  FiChevronDown, FiChevronRight, FiClock, FiPlus, FiCpu, FiBell,
  FiSettings, FiShoppingBag, FiTrendingUp, FiTrendingDown,
  FiUser, FiActivity
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import Back from 'src/component/button/Back';
import { BiMoney } from 'react-icons/bi';

const CollapsibleGroup = ({ label, icon: CategoryIcon, isOpen, setIsOpen, prefix, links, pathname, setAdminSidebar }) => {
  const isGroupActive = pathname.startsWith(prefix);
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
          isGroupActive
            ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
            : 'text-white font-medium hover:text-primary hover:bg-secondary'
        }`}
      >
        <div className="flex items-center gap-3">
          <CategoryIcon className={`text-base ${isGroupActive ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
          <span>{label}</span>
        </div>
        {isOpen ? (
          <FiChevronDown className="text-white text-xs" />
        ) : (
          <FiChevronRight className="text-white text-xs" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1 pl-4 border-l border-secondary/30 ml-4 my-0.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAdminSidebar(false)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-secondary text-primary font-bold shadow-2xs'
                    : 'text-white font-medium hover:bg-secondary hover:text-primary'
                }`}
              >
                <Icon className={`text-xs ${isActive ? 'text-primary' : 'text-white'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const NavLinkGroup = ({ links, pathname, setAdminSidebar }) => (
  <nav className="flex flex-col gap-1">
    {links.map((link) => {
      const Icon = link.icon;
      const isActive = pathname === link.href;

      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setAdminSidebar(false)}
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
);

const Sidebar = ({ allowedModules = null, isDevAdmin = false }) => {
  const pathname = usePathname();
  const { adminSidebar, setAdminSidebar } = useContext(TenantWebsiteContext);

  // Check if a website module is permitted
  const isAllowed = (moduleSlug) => {
    if (isDevAdmin) return true;
    if (!allowedModules || !Array.isArray(allowedModules)) return true; // show all if not restricted
    if (!moduleSlug) return true;
    return allowedModules.includes(moduleSlug);
  };

  // Dynamic collapsible state
  const [classesOpen, setClassesOpen] = useState(pathname.startsWith('/staff-panel/classes'));
  const [subjectsOpen, setSubjectsOpen] = useState(pathname.startsWith('/staff-panel/subjects'));
  const [teachersOpen, setTeachersOpen] = useState(pathname.startsWith('/staff-panel/teachers'));
  const [authoritiesOpen, setAuthoritiesOpen] = useState(pathname.startsWith('/staff-panel/authorities'));
  const [examsOpen, setExamsOpen] = useState(pathname.startsWith('/staff-panel/exams'));
  const [studentsOpen, setStudentsOpen] = useState(pathname.startsWith('/staff-panel/students'));
  const [clubsOpen, setClubsOpen] = useState(pathname.startsWith('/staff-panel/clubs'));
  const [newsOpen, setNewsOpen] = useState(pathname.startsWith('/staff-panel/news'));
  const [achievementsOpen, setAchievementsOpen] = useState(pathname.startsWith('/staff-panel/achievements'));
  const [recognitionsOpen, setRecognitionsOpen] = useState(pathname.startsWith('/staff-panel/recognition'));
  const [eventsOpen, setEventsOpen] = useState(pathname.startsWith('/staff-panel/events'));
  const [historyOpen, setHistoryOpen] = useState(pathname.startsWith('/staff-panel/history'));
  const [hostelsOpen, setHostelsOpen] = useState(pathname.startsWith('/staff-panel/hostels'));
  const [staffOpen, setStaffOpen] = useState(pathname.startsWith('/staff-panel/staff'));
  const [documentsOpen, setDocumentsOpen] = useState(pathname.startsWith('/staff-panel/documents'));

  const documentLinks = [
    { label: 'Documents Hub', href: '/staff-panel/documents', icon: FiFileText },
    { label: 'Transfer Certificates', href: '/staff-panel/documents/transfer-certificates', icon: FiUserCheck },
    { label: 'Exam Admit Cards', href: '/staff-panel/documents/admit-cards', icon: FiFileText },
    { label: 'Student ID Cards', href: '/staff-panel/documents/id-cards', icon: FiAward },
    { label: 'Testimonials', href: '/staff-panel/documents/testimonials', icon: FiAward },
    { label: 'Transferred Students', href: '/staff-panel/documents/transferred-students', icon: FiUsers },
  ];

  const historyLinks = [
    { label: 'History Milestones', href: '/staff-panel/history', icon: FiClock },
    { label: 'Add History', href: '/staff-panel/history/new', icon: FiPlus },
  ];

  const eventLinks = [
    { label: 'All Events', href: '/staff-panel/events', icon: FiCalendar },
    { label: 'Create New Event', href: '/staff-panel/events/new', icon: FiPlus },
    { label: 'Event Participants', href: '/staff-panel/events/participants', icon: FiUsers },
  ];

  const systemLinks = [
    { label: 'Dashboard Overview', href: '/staff-panel', icon: FiHome },
    { label: 'Staff Profile', href: '/staff-panel/profile', icon: FiUser },
    { label: 'Login Logs', href: '/staff-panel/logs/login', icon: FiClock },
    { label: 'Activity Audit', href: '/staff-panel/logs/activity', icon: FiActivity },
    { label: 'Website Settings', href: '/staff-panel/settings', icon: FiSettings },
    { label: 'Access Control', href: '/staff-panel/access', icon: FiShield },
    { label: 'Security Audit', href: '/staff-panel/security', icon: FiShield },
    { label: 'Website Announcement', href: '/staff-panel/announcements', icon: FiBell },
  ];

  const financeLogisticsLinks = [
    { label: 'General Finance', href: '/staff-panel/finance', icon: FiDollarSign },
    { label: 'Inventory Assets', href: '/staff-panel/inventory', icon: FiShoppingBag },
  ];

  const classLinks = [
    { label: 'Classes List', href: '/staff-panel/classes/class', icon: FiLayers },
    { label: 'Sections List', href: '/staff-panel/classes/sections', icon: FiGrid },
    { label: 'Class Routine', href: '/staff-panel/classes/routine', icon: FiClock },
    { label: 'Syllabus', href: '/staff-panel/classes/syllabus', icon: FiFileText },
  ];

  const subjectLinks = [
    { label: 'Subjects List', href: '/staff-panel/subjects/new', icon: FiBook },
    { label: 'Subject Allocation', href: '/staff-panel/subjects/allocation', icon: FiLayers },
  ];

  const studentLinks = [
    { label: 'Students List', href: '/staff-panel/students/lists', icon: FiUsers },
    { label: 'Promote Students', href: '/staff-panel/students/promote', icon: FiTrendingUp },
    { label: 'Demote Students', href: '/staff-panel/students/demote', icon: FiTrendingDown },
    { label: 'Intake Applications', href: '/staff-panel/students/admissions', icon: FiUserPlus },
    { label: 'Admission Circulars', href: '/staff-panel/students/admissions/circulars', icon: FiLayers },
    { label: 'Student Leaves', href: '/staff-panel/students/leaves', icon: FiCalendar },
    { label: 'Attendance Registry', href: '/staff-panel/students/attendance', icon: FiCalendar },
    { label: 'Fees & Ledgers', href: '/staff-panel/students/fees', icon: FiDollarSign },
    { label: 'Monthly Fee Rates', href: '/staff-panel/students/fees/monthly-rates', icon: FiDollarSign },
    { label: 'Enter Marks', href: '/staff-panel/students/marks', icon: FiBook },
    { label: 'Publish Results', href: '/staff-panel/students/results', icon: FiAward },
    { label: 'Transcripts Card', href: '/staff-panel/students/transcripts', icon: FiFileText },
  ];

  const clubLinks = [
    { label: 'Register Club', href: '/staff-panel/clubs/new', icon: FiPlus },
    { label: 'Assign Roles', href: '/staff-panel/clubs/assign', icon: FiUsers },
    { label: 'Club Announcements', href: '/staff-panel/clubs/announcements', icon: FiBell },
    { label: 'Club News List', href: '/staff-panel/clubs/news/list', icon: FiFileText },
    { label: 'Publish Club News', href: '/staff-panel/clubs/news/new', icon: FiPlus },
  ];

  const newsLinks = [
    { label: 'News Articles', href: '/staff-panel/news/list', icon: FiFileText },
    { label: 'Publish News', href: '/staff-panel/news/new', icon: FiPlus },
  ];

  const achievementLinks = [
    { label: 'Recorded Achievements', href: '/staff-panel/achievements/list', icon: FiAward },
    { label: 'Add Achievement', href: '/staff-panel/achievements/new', icon: FiPlus },
  ];

  const recognitionLinks = [
    { label: 'All Recognitions', href: '/staff-panel/recognition/list', icon: FiAward },
    { label: 'Add Recognition', href: '/staff-panel/recognition/new', icon: FiPlus },
  ];

  const teacherLinks = [
    { label: 'New Teacher Account', href: '/staff-panel/teachers/new', icon: FiUserPlus },
    { label: 'Teachers List', href: '/staff-panel/teachers/list', icon: FiUsers },
    { label: 'Class Assignments', href: '/staff-panel/teachers/assign-classes', icon: FiAward },
    { label: 'Attendance Registry', href: '/staff-panel/teachers/attendences', icon: FiCalendar },
    { label: 'Salary Ledger', href: '/staff-panel/teachers/salary', icon: FiDollarSign },
    { label: 'Applications Drawer', href: '/staff-panel/teachers/applications', icon: FiFileText },
    { label: 'Manage Qualifications', href: '/staff-panel/teachers/qualification', icon: FiAward },
  ];

  const authorityLinks = [
    { label: 'New Board Member', href: '/staff-panel/authorities/new', icon: FiUserPlus },
    { label: 'Board Members List', href: '/staff-panel/authorities/list', icon: FiUsers },
    { label: 'Board Qualifications', href: '/staff-panel/authorities/qualification', icon: FiAward },
    { label: 'Designations', href: '/staff-panel/authorities/designations', icon: FiAward },
  ];

  const staffLinks = [
    { label: 'New Staff Member', href: '/staff-panel/staff/new', icon: FiUserPlus },
    { label: 'Staff Registry', href: '/staff-panel/staff/list', icon: FiUsers },
    { label: 'Attendance Registry', href: '/staff-panel/staff/attendance', icon: FiCalendar },
    { label: 'Leave Approvals', href: '/staff-panel/staff/leaves', icon: FiCalendar },
    { label: 'Salary Ledger', href: '/staff-panel/staff/salary', icon: FiDollarSign },
  ];

  const examLinks = [
    { label: 'New Exam Routine', href: '/staff-panel/exams/new', icon: FiPlus },
    { label: 'Current Exams', href: '/staff-panel/exams/current', icon: FiCalendar },
    { label: 'Upcoming Exams', href: '/staff-panel/exams/upcoming', icon: FiCalendar },
    { label: 'Previous Exams', href: '/staff-panel/exams/previous', icon: FiFileText },
    { label: 'Grade Scale Setup', href: '/staff-panel/exams/grades', icon: FiAward },
  ];

  const hostelLinks = [
    { label: 'Hostels Directory', href: '/staff-panel/hostels', icon: FiHome },
    { label: 'Student Applications', href: '/staff-panel/hostels/applications', icon: FiFileText },
    { label: 'Rooms & Seats', href: '/staff-panel/hostels/rooms', icon: FiGrid },
    { label: 'Student Allocations', href: '/staff-panel/hostels/allocations', icon: FiUsers },
    { label: 'Student Fees', href: '/staff-panel/hostels/fees', icon: BiMoney },
    { label: 'Faculty Provosts', href: '/staff-panel/hostels/provosts', icon: FiUserCheck },
  ];

  const groupHeaderStyle = "text-[10px] font-bold text-white uppercase tracking-wider px-3 mb-1 mt-3 flex items-center gap-1.5";

  return (
    <>
      {adminSidebar && (
        <div
          className="fixed inset-0 top-16 bg-secondary-dark/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-200"
          onClick={() => setAdminSidebar(false)}
        />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-primary border-r border-secondary/20 z-40 flex flex-col justify-between py-5 px-3 transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          adminSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-3">
          <Back/>

          {/* Group 1: Academics Setup */}
          {(isAllowed('routine') || isAllowed('exams') || isAllowed('sis')) && (
            <div className="flex flex-col gap-1">
              <span className={groupHeaderStyle}>
                <FiLayers className="text-xs" /> Academics Setup
              </span>
              {isAllowed('routine') && (
                <>
                  <CollapsibleGroup label="Classes" icon={FiLayers} isOpen={classesOpen} setIsOpen={setClassesOpen} prefix="/staff-panel/classes" links={classLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                  <CollapsibleGroup label="Subjects" icon={FiBook} isOpen={subjectsOpen} setIsOpen={setSubjectsOpen} prefix="/staff-panel/subjects" links={subjectLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                </>
              )}
              {isAllowed('exams') && (
                <CollapsibleGroup label="Exams" icon={FiCalendar} isOpen={examsOpen} setIsOpen={setExamsOpen} prefix="/staff-panel/exams" links={examLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
              )}
            </div>
          )}

          {/* Group 2: Directory Registry */}
          {(isAllowed('sis') || isAllowed('staff-payroll')) && (
            <div className="flex flex-col gap-1">
              <span className={groupHeaderStyle}>
                <FiUsers className="text-xs" /> Directory Registry
              </span>
              {isAllowed('sis') && (
                <>
                  <CollapsibleGroup label="Students" icon={FiUsers} isOpen={studentsOpen} setIsOpen={setStudentsOpen} prefix="/staff-panel/students" links={studentLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                  <CollapsibleGroup label="Student Documents" icon={FiFileText} isOpen={documentsOpen} setIsOpen={setDocumentsOpen} prefix="/staff-panel/documents" links={documentLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                </>
              )}
              {isAllowed('staff-payroll') && (
                <>
                  <CollapsibleGroup label="Teachers" icon={FiUsers} isOpen={teachersOpen} setIsOpen={setTeachersOpen} prefix="/staff-panel/teachers" links={teacherLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                  <CollapsibleGroup label="Board Members" icon={FiShield} isOpen={authoritiesOpen} setIsOpen={setAuthoritiesOpen} prefix="/staff-panel/authorities" links={authorityLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                  <CollapsibleGroup label="Staff Members" icon={FiUsers} isOpen={staffOpen} setIsOpen={setStaffOpen} prefix="/staff-panel/staff" links={staffLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                </>
              )}
            </div>
          )}

          {/* Group 3: Finance & Logistics */}
          {(isAllowed('accounting') || isAllowed('fees') || isAllowed('hostel')) && (
            <div className="flex flex-col gap-1">
              <span className={groupHeaderStyle}>
                <FiDollarSign className="text-xs" /> Finance & Logistics
              </span>
              {isAllowed('accounting') && <NavLinkGroup links={financeLogisticsLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />}
              {isAllowed('hostel') && (
                <CollapsibleGroup label="Hostels" icon={FiHome} isOpen={hostelsOpen} setIsOpen={setHostelsOpen} prefix="/staff-panel/hostels" links={hostelLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
              )}
            </div>
          )}

          {/* Group 4: Campus & Co-curricular */}
          {(isAllowed('website-builder') || isAllowed('notices')) && (
            <div className="flex flex-col gap-1">
              <span className={groupHeaderStyle}>
                <FiUsers className="text-xs" /> Campus & Co-curricular
              </span>
              {isAllowed('website-builder') && (
                <CollapsibleGroup label="Clubs" icon={FiUsers} isOpen={clubsOpen} setIsOpen={setClubsOpen} prefix="/staff-panel/clubs" links={clubLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
              )}
              {isAllowed('notices') && (
                <CollapsibleGroup label="Campus News" icon={FiFileText} isOpen={newsOpen} setIsOpen={setNewsOpen} prefix="/staff-panel/news" links={newsLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
              )}
              {isAllowed('website-builder') && (
                <>
                  <CollapsibleGroup label="Achievements" icon={FiAward} isOpen={achievementsOpen} setIsOpen={setAchievementsOpen} prefix="/staff-panel/achievements" links={achievementLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                  <CollapsibleGroup label="Recognitions" icon={FiAward} isOpen={recognitionsOpen} setIsOpen={setRecognitionsOpen} prefix="/staff-panel/recognition" links={recognitionLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                  <CollapsibleGroup label="Events & Seminars" icon={FiCalendar} isOpen={eventsOpen} setIsOpen={setEventsOpen} prefix="/staff-panel/events" links={eventLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                  <CollapsibleGroup label="Institutional History" icon={FiClock} isOpen={historyOpen} setIsOpen={setHistoryOpen} prefix="/staff-panel/history" links={historyLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
                </>
              )}
            </div>
          )}

          {/* Group 5: System Gateway */}
          <div className="flex flex-col gap-1">
            <span className={groupHeaderStyle}>
              <FiCpu className="text-xs" /> System Gateway
            </span>
            <NavLinkGroup links={systemLinks} pathname={pathname} setAdminSidebar={setAdminSidebar} />
          </div>

        </div>

        <div className="mt-6 pt-3 border-t border-secondary/20">
          <Link
            href="/"
            onClick={() => setAdminSidebar(false)}
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
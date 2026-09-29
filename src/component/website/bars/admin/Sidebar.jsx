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

const Sidebar = () => {
  const pathname = usePathname();
  const { adminSidebar, setAdminSidebar } = useContext(TenantWebsiteContext);

  // Dynamic collapsible state
  const [classesOpen, setClassesOpen] = useState(pathname.startsWith('/admin/classes'));
  const [subjectsOpen, setSubjectsOpen] = useState(pathname.startsWith('/admin/subjects'));
  const [teachersOpen, setTeachersOpen] = useState(pathname.startsWith('/admin/teachers'));
  const [authoritiesOpen, setAuthoritiesOpen] = useState(pathname.startsWith('/admin/authorities'));
  const [examsOpen, setExamsOpen] = useState(pathname.startsWith('/admin/exams'));
  const [studentsOpen, setStudentsOpen] = useState(pathname.startsWith('/admin/students'));
  const [clubsOpen, setClubsOpen] = useState(pathname.startsWith('/admin/clubs'));
  const [newsOpen, setNewsOpen] = useState(pathname.startsWith('/admin/news'));
  const [achievementsOpen, setAchievementsOpen] = useState(pathname.startsWith('/admin/achievements'));
  const [recognitionsOpen, setRecognitionsOpen] = useState(pathname.startsWith('/admin/recognition'));
  const [eventsOpen, setEventsOpen] = useState(pathname.startsWith('/admin/events'));
  const [historyOpen, setHistoryOpen] = useState(pathname.startsWith('/admin/history'));
  const [hostelsOpen, setHostelsOpen] = useState(pathname.startsWith('/admin/hostels'));
  const [staffOpen, setStaffOpen] = useState(pathname.startsWith('/admin/staff'));
  const [documentsOpen, setDocumentsOpen] = useState(pathname.startsWith('/admin/documents'));

  const documentLinks = [
    { label: 'Documents Hub', href: '/admin/documents', icon: FiFileText },
    { label: 'Transfer Certificates', href: '/admin/documents/transfer-certificates', icon: FiUserCheck },
    { label: 'Exam Admit Cards', href: '/admin/documents/admit-cards', icon: FiFileText },
    { label: 'Student ID Cards', href: '/admin/documents/id-cards', icon: FiAward },
    { label: 'Testimonials', href: '/admin/documents/testimonials', icon: FiAward },
    { label: 'Transferred Students', href: '/admin/documents/transferred-students', icon: FiUsers },
  ];

  const historyLinks = [
    { label: 'History Milestones', href: '/admin/history', icon: FiClock },
    { label: 'Add History', href: '/admin/history/new', icon: FiPlus },
  ];

  const eventLinks = [
    { label: 'All Events', href: '/admin/events', icon: FiCalendar },
    { label: 'Create New Event', href: '/admin/events/new', icon: FiPlus },
    { label: 'Event Participants', href: '/admin/events/participants', icon: FiUsers },
  ];

  const systemLinks = [
    { label: 'Dashboard Overview', href: '/admin', icon: FiHome },
    { label: 'Admin Profile', href: '/admin/profile', icon: FiUser },
    { label: 'Login Logs', href: '/admin/logs/login', icon: FiClock },
    { label: 'Activity Audit', href: '/admin/logs/activity', icon: FiActivity },
    { label: 'Website Settings', href: '/admin/settings', icon: FiSettings },
    { label: 'Access Control', href: '/admin/access', icon: FiShield },
    { label: 'Security Audit', href: '/admin/security', icon: FiShield },
    { label: 'Website Announcement', href: '/admin/announcements', icon: FiBell },
  ];

  const financeLogisticsLinks = [
    { label: 'General Finance', href: '/admin/finance', icon: FiDollarSign },
    { label: 'Inventory Assets', href: '/admin/inventory', icon: FiShoppingBag },
  ];

  const classLinks = [
    { label: 'Classes List', href: '/admin/classes/class', icon: FiLayers },
    { label: 'Sections List', href: '/admin/classes/sections', icon: FiGrid },
    { label: 'Class Routine', href: '/admin/classes/routine', icon: FiClock },
    { label: 'Syllabus', href: '/admin/classes/syllabus', icon: FiFileText },
  ];

  const subjectLinks = [
    { label: 'Subjects List', href: '/admin/subjects/new', icon: FiBook },
    { label: 'Subject Allocation', href: '/admin/subjects/allocation', icon: FiLayers },
  ];

  const studentLinks = [
    { label: 'Students List', href: '/admin/students/lists', icon: FiUsers },
    { label: 'Promote Students', href: '/admin/students/promote', icon: FiTrendingUp },
    { label: 'Demote Students', href: '/admin/students/demote', icon: FiTrendingDown },
    { label: 'Intake Applications', href: '/admin/students/admissions', icon: FiUserPlus },
    { label: 'Admission Circulars', href: '/admin/students/admissions/circulars', icon: FiLayers },
    { label: 'Student Leaves', href: '/admin/students/leaves', icon: FiCalendar },
    { label: 'Attendance Registry', href: '/admin/students/attendance', icon: FiCalendar },
    { label: 'Fees & Ledgers', href: '/admin/students/fees', icon: FiDollarSign },
    { label: 'Monthly Fee Rates', href: '/admin/students/fees/monthly-rates', icon: FiDollarSign },
    { label: 'Enter Marks', href: '/admin/students/marks', icon: FiBook },
    { label: 'Publish Results', href: '/admin/students/results', icon: FiAward },
    { label: 'Transcripts Card', href: '/admin/students/transcripts', icon: FiFileText },
  ];

  const clubLinks = [
    { label: 'Register Club', href: '/admin/clubs/new', icon: FiPlus },
    { label: 'Assign Roles', href: '/admin/clubs/assign', icon: FiUsers },
    { label: 'Club Announcements', href: '/admin/clubs/announcements', icon: FiBell },
    { label: 'Club News List', href: '/admin/clubs/news/list', icon: FiFileText },
    { label: 'Publish Club News', href: '/admin/clubs/news/new', icon: FiPlus },
  ];

  const newsLinks = [
    { label: 'News Articles', href: '/admin/news/list', icon: FiFileText },
    { label: 'Publish News', href: '/admin/news/new', icon: FiPlus },
  ];

  const achievementLinks = [
    { label: 'Recorded Achievements', href: '/admin/achievements/list', icon: FiAward },
    { label: 'Add Achievement', href: '/admin/achievements/new', icon: FiPlus },
  ];

  const recognitionLinks = [
    { label: 'All Recognitions', href: '/admin/recognition/list', icon: FiAward },
    { label: 'Add Recognition', href: '/admin/recognition/new', icon: FiPlus },
  ];

  const teacherLinks = [
    { label: 'New Teacher Account', href: '/admin/teachers/new', icon: FiUserPlus },
    { label: 'Teachers List', href: '/admin/teachers/list', icon: FiUsers },
    { label: 'Class Assignments', href: '/admin/teachers/assign-classes', icon: FiAward },
    { label: 'Attendance Registry', href: '/admin/teachers/attendences', icon: FiCalendar },
    { label: 'Salary Ledger', href: '/admin/teachers/salary', icon: FiDollarSign },
    { label: 'Applications Drawer', href: '/admin/teachers/applications', icon: FiFileText },
    { label: 'Manage Qualifications', href: '/admin/teachers/qualification', icon: FiAward },
  ];

  const authorityLinks = [
    { label: 'New Board Member', href: '/admin/authorities/new', icon: FiUserPlus },
    { label: 'Board Members List', href: '/admin/authorities/list', icon: FiUsers },
    { label: 'Board Qualifications', href: '/admin/authorities/qualification', icon: FiAward },
    { label: 'Designations', href: '/admin/authorities/designations', icon: FiAward },
  ];

  const staffLinks = [
    { label: 'New Staff Member', href: '/admin/staff/new', icon: FiUserPlus },
    { label: 'Staff Registry', href: '/admin/staff/list', icon: FiUsers },
    { label: 'Attendance Registry', href: '/admin/staff/attendance', icon: FiCalendar },
    { label: 'Leave Approvals', href: '/admin/staff/leaves', icon: FiCalendar },
    { label: 'Salary Ledger', href: '/admin/staff/salary', icon: FiDollarSign },
  ];

  const examLinks = [
    { label: 'New Exam Routine', href: '/admin/exams/new', icon: FiPlus },
    { label: 'Current Exams', href: '/admin/exams/current', icon: FiCalendar },
    { label: 'Upcoming Exams', href: '/admin/exams/upcoming', icon: FiCalendar },
    { label: 'Previous Exams', href: '/admin/exams/previous', icon: FiFileText },
    { label: 'Grade Scale Setup', href: '/admin/exams/grades', icon: FiAward },
  ];

  const hostelLinks = [
    { label: 'Hostels Directory', href: '/admin/hostels', icon: FiHome },
    { label: 'Student Applications', href: '/admin/hostels/applications', icon: FiFileText },
    { label: 'Rooms & Seats', href: '/admin/hostels/rooms', icon: FiGrid },
    { label: 'Student Allocations', href: '/admin/hostels/allocations', icon: FiUsers },
    { label: 'Student Fees', href: '/admin/hostels/fees', icon: BiMoney },
    { label: 'Faculty Provosts', href: '/admin/hostels/provosts', icon: FiUserCheck },
  ];

  const groupHeaderStyle = "text-[10px] font-bold text-white uppercase tracking-wider px-3 mb-1 mt-3 flex items-center gap-1.5";

  const CollapsibleGroup = ({ label, icon: CategoryIcon, isOpen, setIsOpen, prefix, links }) => {
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

  const NavLinkGroup = ({ links }) => (
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
          <div className="flex flex-col gap-1">
            <span className={groupHeaderStyle}>
              <FiLayers className="text-xs" /> Academics Setup
            </span>
            <CollapsibleGroup label="Classes" icon={FiLayers} isOpen={classesOpen} setIsOpen={setClassesOpen} prefix="/admin/classes" links={classLinks} />
            <CollapsibleGroup label="Subjects" icon={FiBook} isOpen={subjectsOpen} setIsOpen={setSubjectsOpen} prefix="/admin/subjects" links={subjectLinks} />
            <CollapsibleGroup label="Exams" icon={FiCalendar} isOpen={examsOpen} setIsOpen={setExamsOpen} prefix="/admin/exams" links={examLinks} />
          </div>

          {/* Group 2: Directory Registry */}
          <div className="flex flex-col gap-1">
            <span className={groupHeaderStyle}>
              <FiUsers className="text-xs" /> Directory Registry
            </span>
            <CollapsibleGroup label="Students" icon={FiUsers} isOpen={studentsOpen} setIsOpen={setStudentsOpen} prefix="/admin/students" links={studentLinks} />
            <CollapsibleGroup label="Student Documents" icon={FiFileText} isOpen={documentsOpen} setIsOpen={setDocumentsOpen} prefix="/admin/documents" links={documentLinks} />
            <CollapsibleGroup label="Teachers" icon={FiUsers} isOpen={teachersOpen} setIsOpen={setTeachersOpen} prefix="/admin/teachers" links={teacherLinks} />
            <CollapsibleGroup label="Board Members" icon={FiShield} isOpen={authoritiesOpen} setIsOpen={setAuthoritiesOpen} prefix="/admin/authorities" links={authorityLinks} />
            <CollapsibleGroup label="Staff Members" icon={FiUsers} isOpen={staffOpen} setIsOpen={setStaffOpen} prefix="/admin/staff" links={staffLinks} />
          </div>

          {/* Group 3: Finance & Logistics */}
          <div className="flex flex-col gap-1">
            <span className={groupHeaderStyle}>
              <FiDollarSign className="text-xs" /> Finance & Logistics
            </span>
            <NavLinkGroup links={financeLogisticsLinks} />
            <CollapsibleGroup label="Hostels" icon={FiHome} isOpen={hostelsOpen} setIsOpen={setHostelsOpen} prefix="/admin/hostels" links={hostelLinks} />
          </div>

          {/* Group 4: Campus & Co-curricular */}
          <div className="flex flex-col gap-1">
            <span className={groupHeaderStyle}>
              <FiUsers className="text-xs" /> Campus & Co-curricular
            </span>
            <CollapsibleGroup label="Clubs" icon={FiUsers} isOpen={clubsOpen} setIsOpen={setClubsOpen} prefix="/admin/clubs" links={clubLinks} />
            <CollapsibleGroup label="Campus News" icon={FiFileText} isOpen={newsOpen} setIsOpen={setNewsOpen} prefix="/admin/news" links={newsLinks} />
            <CollapsibleGroup label="Achievements" icon={FiAward} isOpen={achievementsOpen} setIsOpen={setAchievementsOpen} prefix="/admin/achievements" links={achievementLinks} />
            <CollapsibleGroup label="Recognitions" icon={FiAward} isOpen={recognitionsOpen} setIsOpen={setRecognitionsOpen} prefix="/admin/recognition" links={recognitionLinks} />
            <CollapsibleGroup label="Events & Seminars" icon={FiCalendar} isOpen={eventsOpen} setIsOpen={setEventsOpen} prefix="/admin/events" links={eventLinks} />
            <CollapsibleGroup label="Institutional History" icon={FiClock} isOpen={historyOpen} setIsOpen={setHistoryOpen} prefix="/admin/history" links={historyLinks} />
          </div>

          {/* Group 5: System Gateway */}
          <div className="flex flex-col gap-1">
            <span className={groupHeaderStyle}>
              <FiCpu className="text-xs" /> System Gateway
            </span>
            <NavLinkGroup links={systemLinks} />
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
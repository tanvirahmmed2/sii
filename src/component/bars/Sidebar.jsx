'use client';

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenantWebsiteContext } from '../helper/WebsiteContext';
import { FiX, FiChevronDown, FiHome, FiInfo, FiBookOpen, FiGrid, FiMail, FiLogIn, FiArrowRight, FiCalendar, FiShield } from 'react-icons/fi';
import { MdOutlineAnnouncement } from 'react-icons/md';
import { SCHOOL_NAME } from '@/lib/secret';

const Sidebar = () => {
  const { sidebar, setSidebar, classes, clubs, designations, websiteSettings } = useContext(TenantWebsiteContext);
  const pathname = usePathname();

  const schoolName = websiteSettings?.school_name || SCHOOL_NAME;

  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const closeSidebar = () => setSidebar(false);

  const isActive = (path) => pathname === path;

  return (
    <>
      <div
        className={`fixed inset-0 bg-secondary-dark/40 backdrop-blur-xs z-50 transition-opacity duration-300 md:hidden ${
          sidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      <aside
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-primary text-white z-50 flex flex-col justify-between py-6 px-4 shadow-2xl border-l border-secondary/20 transition-transform duration-300 ease-in-out md:hidden overflow-y-auto ${
          sidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between pb-4 border-b border-secondary/20">
            <Link href="/" onClick={closeSidebar} className="flex items-center gap-2 group">
              <div className="flex flex-col">
                <span className="font-bold text-base leading-tight text-white">
                  {schoolName}
                </span>
              </div>
            </Link>
            <button
              onClick={closeSidebar}
              className="p-2 rounded-xl text-white hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiHome className={`text-base ${isActive('/') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Home</span>
            </Link>

            <Link
              href="/events"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/events')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiCalendar className={`text-base ${isActive('/events') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Events</span>
            </Link>

            <Link
              href="/notices"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/notices')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <MdOutlineAnnouncement className={`text-base ${isActive('/notices') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Notices</span>
            </Link>

            {/* Accordion 1: About */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleSection('about')}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
                  openSection === 'about'
                    ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                    : 'text-white font-medium hover:text-primary hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiInfo className={`text-base ${openSection === 'about' ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                  <span>About</span>
                </div>
                <FiChevronDown
                  className={`text-xs text-white group-hover:text-primary transition-transform duration-200 ${openSection === 'about' ? 'rotate-180 text-primary' : ''}`}
                />
              </button>
              {openSection === 'about' && (
                <div className="pl-4 border-l border-secondary/30 ml-4 my-1 flex flex-col gap-1">
                  <Link href="/about" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    About Overview
                  </Link>
                  <Link href="/about/campus" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    My Campus
                  </Link>
                  <Link href="/about/mission" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    Mission
                  </Link>
                  <Link href="/about/vision" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    Vision
                  </Link>
                  <Link href="/about/history" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    History
                  </Link>
                </div>
              )}
            </div>

            {/* Accordion: Authorities */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleSection('authorities')}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
                  openSection === 'authorities'
                    ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                    : 'text-white font-medium hover:text-primary hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiShield className={`text-base ${openSection === 'authorities' ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                  <span>Authorities</span>
                </div>
                <FiChevronDown
                  className={`text-xs text-white group-hover:text-primary transition-transform duration-200 ${openSection === 'authorities' ? 'rotate-180 text-primary' : ''}`}
                />
              </button>
              {openSection === 'authorities' && (
                <div className="pl-4 border-l border-secondary/30 ml-4 my-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  <Link
                    href="/authorities"
                    onClick={closeSidebar}
                    className="text-xs text-white hover:bg-secondary hover:text-primary py-1.5 px-2.5 rounded-lg transition-colors font-bold"
                  >
                    All Authorities
                  </Link>
                  {designations && designations.length > 0 ? (
                    designations.map((d) => (
                      <Link
                        key={d.id || d.slug}
                        href={`/authorities/${d.slug}`}
                        onClick={closeSidebar}
                        className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium"
                      >
                        {d.title}
                      </Link>
                    ))
                  ) : (
                    <span className="text-xs text-white/70 italic py-1 px-2.5">No roles available</span>
                  )}
                </div>
              )}
            </div>

            {/* Administration */}
            <Link
              href="/administration"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/administration')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiBookOpen className={`text-base ${isActive('/administration') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Administration</span>
            </Link>

            {/* Accordion 2: Classes */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleSection('classes')}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
                  openSection === 'classes'
                    ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                    : 'text-white font-medium hover:text-primary hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiBookOpen className={`text-base ${openSection === 'classes' ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                  <span>Classes</span>
                </div>
                <FiChevronDown
                  className={`text-xs text-white group-hover:text-primary transition-transform duration-200 ${openSection === 'classes' ? 'rotate-180 text-primary' : ''}`}
                />
              </button>
              {openSection === 'classes' && (
                <div className="pl-4 border-l border-secondary/30 ml-4 my-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  <Link
                    href="/classes"
                    onClick={closeSidebar}
                    className="text-xs text-white hover:bg-secondary hover:text-primary py-1.5 px-2.5 rounded-lg transition-colors font-bold"
                  >
                    All Classes
                  </Link>
                  {classes && classes.length > 0 ? (
                    classes.map((c) => (
                      <Link
                        key={c.id || c.code}
                        href={`/classes/${c.code || c.id}`}
                        onClick={closeSidebar}
                        className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium"
                      >
                        {c.name}
                      </Link>
                    ))
                  ) : (
                    <span className="text-xs text-white/70 italic py-1 px-2.5">No classes available</span>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 3: Facilities */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleSection('facilities')}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
                  openSection === 'facilities'
                    ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                    : 'text-white font-medium hover:text-primary hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiGrid className={`text-base ${openSection === 'facilities' ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                  <span>Facilities</span>
                </div>
                <FiChevronDown
                  className={`text-xs text-white group-hover:text-primary transition-transform duration-200 ${openSection === 'facilities' ? 'rotate-180 text-primary' : ''}`}
                />
              </button>
              {openSection === 'facilities' && (
                <div className="pl-4 border-l border-secondary/30 ml-4 my-1 flex flex-col gap-1">
                  <Link href="/facilities" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    Facilities Overview
                  </Link>
                  <Link href="/facilities/classrooms" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    Classrooms
                  </Link>
                  <Link href="/facilities/hostels" onClick={closeSidebar} className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium">
                    Hostels
                  </Link>
                </div>
              )}
            </div>

            {/* Accordion 4: Clubs */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleSection('clubs')}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer group ${
                  openSection === 'clubs'
                    ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                    : 'text-white font-medium hover:text-primary hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiInfo className={`text-base ${openSection === 'clubs' ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
                  <span>Clubs</span>
                </div>
                <FiChevronDown
                  className={`text-xs text-white group-hover:text-primary transition-transform duration-200 ${openSection === 'clubs' ? 'rotate-180 text-primary' : ''}`}
                />
              </button>
              {openSection === 'clubs' && (
                <div className="pl-4 border-l border-secondary/30 ml-4 my-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  <Link
                    href="/clubs"
                    onClick={closeSidebar}
                    className="text-xs text-white hover:bg-secondary hover:text-primary py-1.5 px-2.5 rounded-lg transition-colors font-bold"
                  >
                    All Clubs
                  </Link>
                  {clubs && clubs.length > 0 ? (
                    clubs.map((c) => (
                      <Link
                        key={c.id || c.slug}
                        href={`/clubs/${c.slug || c.id}`}
                        onClick={closeSidebar}
                        className="text-xs text-white hover:text-primary hover:bg-secondary py-1.5 px-2.5 rounded-lg transition-colors font-medium"
                      >
                        {c.name}
                      </Link>
                    ))
                  ) : (
                    <span className="text-xs text-white/70 italic py-1 px-2.5">No clubs available</span>
                  )}
                </div>
              )}
            </div>

            {/* Teachers */}
            <Link
              href="/teachers"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/teachers')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiBookOpen className={`text-base ${isActive('/teachers') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Teachers</span>
            </Link>

            {/* Staff */}
            <Link
              href="/staffs"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/staffs')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiBookOpen className={`text-base ${isActive('/staffs') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Staff Directory</span>
            </Link>

            {/* Gallery */}
            <Link
              href="/gallery"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/gallery')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiGrid className={`text-base ${isActive('/gallery') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Photo Gallery</span>
            </Link>

            {/* News */}
            <Link
              href="/news"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/news')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiInfo className={`text-base ${isActive('/news') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>News Hub</span>
            </Link>

            {/* Results */}
            <Link
              href="/results"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/results')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiGrid className={`text-base ${isActive('/results') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Results Portal</span>
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 group ${
                isActive('/contact')
                  ? 'bg-secondary text-primary font-bold border border-secondary shadow-2xs'
                  : 'text-white font-medium hover:text-primary hover:bg-secondary'
              }`}
            >
              <FiMail className={`text-base ${isActive('/contact') ? 'text-primary' : 'text-white group-hover:text-primary'}`} />
              <span>Contact Us</span>
            </Link>
          </nav>
        </div>

        {/* Footer Actions inside Drawer */}
        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-secondary/20">
          <Link
            href="/auth/student"
            onClick={closeSidebar}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-secondary text-white hover:bg-secondary hover:text-primary font-semibold text-xs transition-colors"
          >
            <span>Student Portal</span>
          </Link>
          <Link
            href="/auth/access"
            onClick={closeSidebar}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-secondary text-primary hover:bg-primary-light font-semibold text-xs transition-colors"
          >
            <FiLogIn />
            <span>Login</span>
          </Link>
          <Link
            href="/apply"
            onClick={closeSidebar}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl bg-primary-dark hover:bg-primary-dark/90 text-white border border-secondary/20 font-semibold text-xs shadow-xs transition-colors"
          >
            <span>Apply Now</span>
            <FiArrowRight />
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
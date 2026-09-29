'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from '../helper/WebsiteContext';
import { MdMenu } from 'react-icons/md';
import { LOGO_URL, SCHOOL_NAME } from '@/lib/secret';
import Image from 'next/image';

const Navbar = () => {
  const { classes, clubs, designations, sidebar, setSidebar, websiteSettings } = useContext(TenantWebsiteContext);

  const schoolName = websiteSettings?.school_name || SCHOOL_NAME;

  const navLinkStyle = `px-3 py-2 flex items-center justify-center transition-colors duration-200 cursor-pointer text-xs lg:text-sm font-semibold text-white hover:text-secondary rounded-md whitespace-nowrap`;
  const dropdownTriggerStyle = `px-3 py-2 flex items-center justify-center gap-1 transition-colors duration-200 cursor-pointer bg-transparent border-none text-xs lg:text-sm font-semibold text-white hover:text-secondary rounded-md whitespace-nowrap`;

  return (
    <nav className="relative w-full bg-primary-dark text-white shadow-sm flex flex-col items-center">
     
      <div className="w-full  px-4 md:px-8 flex flex-row items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-9 h-9 bg-white rounded-full overflow-hidden flex items-center justify-center shrink-0">
            <Image 
              alt={schoolName} 
              src={LOGO_URL} 
              width={36} 
              height={36} 
              className="object-contain p-0.5"
            />
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight text-white group-hover:text-secondary transition-colors">
            {schoolName}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-xs lg:text-sm font-semibold">
          <Link href="/notices" className="transition-colors text-white hover:text-secondary">Notices</Link>
          <Link href="/facilities/hostels" className="transition-colors text-white hover:text-secondary">Hostels</Link>
          <Link href="/gallery" className="transition-colors text-white hover:text-secondary">Gallery</Link>
          <Link href="/apply" className="transition-colors text-white hover:text-secondary">Apply</Link>
          <Link href="/auth/student" className="transition-colors text-white hover:text-secondary">Student Portal</Link>
          <Link
            href="/auth/access"
            className="text-primary-dark transition-all bg-white hover:bg-slate-100 hover:shadow-md px-4 py-1.5 rounded-lg font-bold text-xs"
          >
            Login
          </Link>
        </div>

        <button
          onClick={() => setSidebar(!sidebar)}
          className="md:hidden text-2xl transition-colors p-2 rounded-lg text-white hover:bg-white/10"
          aria-label="Toggle Menu"
        >
          <MdMenu />
        </button>
      </div>

      <div className="w-full hidden md:block h-px bg-white/10" />

      <div className="w-full px-4 md:px-8 hidden md:flex flex-row items-center justify-between h-12">
        <div className="flex flex-row items-center justify-between w-full gap-1">
          <Link href="/" className={navLinkStyle}>Home</Link>
          <Link href="/events" className={navLinkStyle}>Events</Link>

          <div className="relative group">
            <Link href="/authorities" className={dropdownTriggerStyle}>
              Authorities
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:block pt-2 z-50">
              <div className="flex flex-col min-w-52 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-100 overflow-hidden">
                {designations && designations.length > 0 ? (
                  designations.map((d) => (
                    <Link 
                      href={`/authorities/${d.slug}`} 
                      key={d.id} 
                      className="px-4 py-2.5 text-xs font-semibold text-left hover:bg-primary-light hover:text-white transition-colors"
                    >
                      {d.title}
                    </Link>
                  ))
                ) : (
                  <span className="px-4 py-2.5 text-slate-400 text-xs italic text-left">No authorities</span>
                )}
              </div>
            </div>
          </div>

          {/* About Dropdown */}
          <div className="relative group">
            <Link href="/about" className={dropdownTriggerStyle}>
              About
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:block pt-2 z-50">
              <div className="flex flex-col min-w-48 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-100 overflow-hidden">
                <Link href="/about/campus" className="px-4 py-2.5 text-xs font-semibold text-left hover:bg-primary-light hover:text-white transition-colors">My Campus</Link>
                <Link href="/about/mission" className="px-4 py-2.5 text-xs font-semibold text-left hover:bg-primary-light hover:text-white transition-colors">Mission</Link>
                <Link href="/about/vision" className="px-4 py-2.5 text-xs font-semibold text-left hover:bg-primary-light hover:text-white transition-colors">Vision</Link>
                <Link href="/about/history" className="px-4 py-2.5 text-xs font-semibold text-left hover:bg-primary-light hover:text-white transition-colors">History</Link>
              </div>
            </div>
          </div>

          <div className="relative group">
            <Link href="/classes" className={dropdownTriggerStyle}>
              Classes
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:block pt-2 z-50">
              <div className="flex flex-col min-w-48 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-100 overflow-hidden max-h-64 overflow-y-auto">
                {classes && classes.length > 0 ? (
                  classes.map((c) => (
                    <Link 
                      href={`/classes/${c.code || c.id || c}`} 
                      key={c.id || c} 
                      className="px-4 py-2.5 text-xs font-semibold text-left hover:bg-primary-light hover:text-white transition-colors"
                    >
                      {c.name || c}
                    </Link>
                  ))
                ) : (
                  <span className="px-4 py-2.5 text-slate-400 text-xs italic text-left">No classes</span>
                )}
              </div>
            </div>
          </div>

          <div className="relative group">
            <Link href="/clubs" className={dropdownTriggerStyle}>
              Clubs
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:block pt-2 z-50">
              <div className="flex flex-col min-w-48 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-100 overflow-hidden max-h-64 overflow-y-auto">
                {clubs && clubs.length > 0 ? (
                  clubs.map((c) => (
                    <Link 
                      href={`/clubs/${c.slug || c.id || c}`} 
                      key={c.id || c} 
                      className="px-4 py-2.5 text-xs font-semibold text-left hover:bg-primary-light hover:text-white transition-colors"
                    >
                      {c.name || c}
                    </Link>
                  ))
                ) : (
                  <span className="px-4 py-2.5 text-slate-400 text-xs italic text-left">No clubs</span>
                )}
              </div>
            </div>
          </div>

          <Link href="/teachers" className={navLinkStyle}>Teachers</Link>
          <Link href="/staffs" className={navLinkStyle}>Staff</Link>
          <Link href="/achievements" className={navLinkStyle}>Achievements</Link>
          <Link href="/news" className={navLinkStyle}>News</Link>
          <Link href="/results" className={navLinkStyle}>Results</Link>
          <Link href="/contact" className={navLinkStyle}>Contact</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
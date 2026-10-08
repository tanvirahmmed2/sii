'use client';

import React, { useContext } from 'react';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Alumni = () => {
  const { website } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || 'Institution';

  const testimonials = [
    {
      name: 'Sarah Rahman',
      batch: 'Class of 2018',
      role: 'Lead Software Architect at Technology Firm',
      quote: 'The academic rigor and laboratory assignments provided fundamental engineering perspective that shaped my professional practice.'
    },
    {
      name: 'Tanvir Ahmed',
      batch: 'Class of 2021',
      role: 'Systems & Cloud Infrastructure Engineer',
      quote: 'Hands-on computing workshops, server labs, and dedicated faculty guidance were directly aligned with current industry expectations.'
    }
  ];

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Graduates Network
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {schoolName} Alumni Association
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Connecting our graduates across academia, engineering enterprises, public administration, and global research institutions.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-xs space-y-1.5">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Network Access
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Global Alumni Registry
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect with fellow graduates to exchange technical knowledge, seek professional mentorship, and explore career advancements.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-xs space-y-1.5">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Careers
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Industry Placement & Referrals
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Direct recruitment referrals and internship sponsorships supported by established alumni working across diverse sectors.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-xs space-y-1.5">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Engagement
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Annual Convocations & Lectures
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Participate in reunion dinners, guest lectures for current students, and advisory boards assessing academic syllabi.
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Graduate Experiences
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((t, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3"
              >
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">{t.name}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{t.batch} &bull; {t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Alumni;
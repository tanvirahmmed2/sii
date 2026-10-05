'use client';

import React from 'react';
import { FiUsers, FiAward, FiGlobe, FiBriefcase } from 'react-icons/fi';

const Alumni = () => {
  const testimonials = [
    {
      name: 'Sarah Rahman',
      batch: 'Class of 2018',
      role: 'Lead Software Architect at Google',
      quote: 'FIT provided the programming fundamentals and hands-on lab projects that shaped my engineering perspective.'
    },
    {
      name: 'Tanvir Ahmed',
      batch: 'Class of 2021',
      role: 'DevOps Engineer at Amazon Web Services',
      quote: 'The systems administration routines, server setups, and network prototyping labs were extremely aligned with field standards.'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-widest">
            Network
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            FIT Alumni Association
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Connecting thousands of graduates global wide. Our alumni hold positions inside leading technical and management companies.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col gap-3 shadow-xs">
            <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center shrink-0">
              <FiUsers />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Graduates Network</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Access to a global directory containing over 5,000 active members to find mentors and explore job vacancies.
            </p>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col gap-3 shadow-xs">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <FiBriefcase />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Alumni Referrals</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Direct referral opportunities at technology partners, multinational institutions, and engineering firms.
            </p>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col gap-3 shadow-xs">
            <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center shrink-0">
              <FiGlobe />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Alumni Meetups</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Annual alumni dinners, technical lectures, campus visit events, and project review panels.
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col gap-6">
          <h3 className="font-semibold text-slate-900 text-base border-b border-slate-100 pb-3">Graduates Stories</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                <p className="text-slate-600 text-xs leading-relaxed italic">
                  "{t.quote}"
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col">
                  <span className="font-semibold text-slate-850 text-xs text-slate-800">{t.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{t.batch} • {t.role}</span>
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
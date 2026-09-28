'use client';

import React from 'react';
import {
  BiGridAlt,
  BiMessageSquareDetail,
  BiCalendar,
  BiGroup,
  BiShieldQuarter,
  BiLineChart,
  BiDesktop,
} from 'react-icons/bi';

export default function SystemManagement() {
  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-16">
        {/* Section Heading */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            One central command hub for your entire business
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Say goodbye to stitching together 10 different subscription services. Manage websites, live chat inquiries, appointments, customer databases, and team roles from a single, unified operations dashboard.
          </p>
        </div>

        {/* 6 Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module 1: Multi-Site */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
              <BiDesktop />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Multi-Website Portfolio Hub</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Launch, organize, and administer multiple client or personal websites from a single account without separate logins or confusing hostings.
            </p>
          </div>

          {/* Module 2: Live Chat */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl">
              <BiMessageSquareDetail />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Customer Chat &amp; Inquiries</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect with visitors while they browse your site. Direct real-time messaging, visitor identification, and automated offline lead capture.
            </p>
          </div>

          {/* Module 3: Appointments */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl">
              <BiCalendar />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Built-in Calendar &amp; Bookings</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Set availability slots, collect booking deposits, send automated reminder notifications, and sync appointments with zero external fees.
            </p>
          </div>

          {/* Module 4: Analytics */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
              <BiLineChart />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Visitor Analytics &amp; Telemetry</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Real-time traffic metrics, top performing pages, conversion funnels, country breakdown, and device telemetry without invasive third-party cookies.
            </p>
          </div>

          {/* Module 5: Team Roles */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
              <BiGroup />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Role-Based Team Collaboration</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Invite editors, developers, marketers, and support operators with granular module-level permission assignments and secure session controls.
            </p>
          </div>

          {/* Module 6: Spam Defense */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl">
              <BiShieldQuarter />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Proactive Spam &amp; DDoS Defense</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Smart bot detection, automated honeypots on contact forms, IP rate limiting, and brute-force protection guarding your platform 24/7.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
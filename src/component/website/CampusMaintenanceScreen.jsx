'use client';

import React from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { FiPhone, FiMail, FiMapPin, FiLock, FiCpu, FiArrowRight } from 'react-icons/fi';

export default function CampusMaintenanceScreen() {
  const { website, primaryColor } = useTenantWebsite();

  const name = website?.name || 'Educational Institution';
  const logo = website?.logo || null;
  const maintenanceMessage =
    website?.maintenance_message ||
    'Our campus website and student portals are temporarily undergoing scheduled maintenance to upgrade academic infrastructure. We will be back online shortly.';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Background Decorative Glow */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[128px] opacity-25 pointer-events-none"
        style={{ backgroundColor: primaryColor || '#1e40af' }}
      />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-[128px] bg-sky-600 opacity-20 pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={name} className="w-10 h-10 object-contain rounded p-1 bg-white/5 border border-white/10" />
          ) : (
            <div
              className="w-10 h-10 rounded flex items-center justify-center font-black text-sm text-white"
              style={{ backgroundColor: primaryColor || '#1e40af' }}
            >
              {name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">{name}</h1>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
              {website?.institution_type || 'Institution'} • Official Portal
            </span>
          </div>
        </div>

        <Link
          href="/auth/access"
          className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5"
        >
          <FiLock size={12} className="text-amber-400" />
          <span>Staff / Student Login</span>
        </Link>
      </header>

      {/* Central Announcement Card */}
      <main className="w-full max-w-2xl my-auto py-12 z-10 text-center space-y-6">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          System Maintenance Active
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          Enhancing Our Digital Campus
        </h2>

        {/* Message */}
        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
          {maintenanceMessage}
        </p>

        {/* Fast Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/auth/access"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs transition shadow-lg flex items-center gap-2"
          >
            <span>Authorized Faculty &amp; Staff Access</span>
            <FiArrowRight size={13} />
          </Link>
          <Link
            href="/auth/access/student"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-medium text-xs transition flex items-center gap-2"
          >
            <FiCpu size={14} className="text-sky-400" />
            <span>Student Portal Sign In</span>
          </Link>
        </div>
      </main>

      {/* Bottom Campus Helplines & Location */}
      <footer className="w-full max-w-4xl py-6 border-t border-slate-800/80 z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
        {website?.contact_phone && (
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              <FiPhone size={14} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Helpline</span>
              <a href={`tel:${website.contact_phone}`} className="text-slate-200 hover:underline">
                {website.contact_phone}
              </a>
            </div>
          </div>
        )}

        {website?.contact_email && (
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              <FiMail size={14} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Office Email</span>
              <a href={`mailto:${website.contact_email}`} className="text-slate-200 hover:underline truncate max-w-[200px] block">
                {website.contact_email}
              </a>
            </div>
          </div>
        )}

        {website?.address && (
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
              <FiMapPin size={14} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Campus Address</span>
              <span className="text-slate-300 line-clamp-1">{website.address}</span>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

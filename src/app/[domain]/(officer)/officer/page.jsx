'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function OfficerDashboardPage() {
  const { website, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [officer, setOfficer] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch(getApiEndpoint('officer/me'));
        if (res.ok) {
          const data = await res.json();
          setOfficer(data.officer || data.payload?.officer);
          setPermissions(data.permissions || data.payload?.permissions || {});
        }
      } catch (err) {
        console.warn('Error fetching officer details in dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, [getApiEndpoint]);

  const permKeys = Object.keys(permissions);
  const allowedCount = permKeys.filter((k) => permissions[k]?.can_view).length;

  return (
    <div className="w-full space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {officer?.department || 'Administration'} Desk
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Status: Verified & Active
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
            Welcome, {officer?.name || 'Officer'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional Operations Portal for {website?.name || 'Campus'}. Manage granted package modules and records below.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={tenantUrl('/officer/profile')}
            className="px-3 py-1.5 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            Manage Security
          </Link>
          <Link
            href={tenantUrl('/officer/settings')}
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
          >
            Preferences
          </Link>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Assigned Designation
          </p>
          <div className="mt-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">
              {officer?.designation || 'Officer'}
            </span>
            <span className="text-[10px] text-slate-500">Official Campus Title</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Operational Department
          </p>
          <div className="mt-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">
              {officer?.department || 'General'}
            </span>
            <span className="text-[10px] text-slate-500">Assigned Branch</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Package Modules
          </p>
          <div className="mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {allowedCount}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-2">Access Granted</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Current Session
          </p>
          <div className="mt-1">
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {new Date().getFullYear()}
            </span>
            <span className="text-[10px] text-slate-500 ml-2">Active Cycle</span>
          </div>
        </div>
      </div>

      {/* Granted Modules Cards Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Assigned Operations Modules
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Module privileges configured for your officer ID by institution staff.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading module access rights...</div>
        ) : allowedCount === 0 ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
            No specific operational modules have been granted yet. Please contact campus administration to adjust your package module permissions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {permKeys
              .filter((k) => permissions[k]?.can_view)
              .map((slug) => {
                const perm = permissions[slug];
                let destination = '/officer';
                if (slug.includes('hostel') || slug.includes('residence') || slug.includes('hall')) {
                  destination = '/officer/residential';
                } else if (slug.includes('library')) {
                  destination = '/officer/library';
                } else if (slug.includes('club')) {
                  destination = '/officer/club';
                }

                return (
                  <div
                    key={slug}
                    className="p-3.5 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800/30 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {perm.module_name || slug}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {slug}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Institutional package module authorized for operations.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                      <div className="space-x-1.5 text-slate-500">
                        {perm.can_create && <span className="text-emerald-600 font-medium">+Create</span>}
                        {perm.can_edit && <span className="text-blue-600 font-medium">Edit</span>}
                        {perm.can_delete && <span className="text-rose-600 font-medium">Delete</span>}
                      </div>

                      <Link
                        href={tenantUrl(destination)}
                        className="font-medium text-slate-900 dark:text-white hover:underline"
                      >
                        Open Desk →
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Fast Operational Tasks */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-2xs space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Officer Responsibilities & Policy Notes
        </h2>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <p>
            • All actions logged under your officer credentials are associated with your active multi-device token sessions.
          </p>
          <p>
            • Ensure two-factor authentication is kept active under Officer Profile for higher administrative integrity.
          </p>
          <p>
            • If you require access to additional school modules, request your staff administrator to update your package permissions matrix.
          </p>
        </div>
      </div>
    </div>
  );
}

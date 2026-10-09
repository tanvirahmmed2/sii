'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { toast } from 'react-hot-toast';

export default function StaffProfilePage() {
  const { website, getApiEndpoint, tenantUrl } = useTenantWebsite();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [allowedModules, setAllowedModules] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiEndpoint('staff/me'));
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to load staff profile.');
      }

      const s = data.payload?.staff || data.paylod?.staff || data.staff;
      setStaff(s);
      setPermissions(data.payload?.permissions || data.paylod?.permissions || data.permissions || {});
      setAllowedModules(data.payload?.allowedModules || data.paylod?.allowedModules || data.allowedModules || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading staff dossier...</p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="w-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Staff Profile Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1">Please ensure your session is active or log in again.</p>
        <div className="mt-4">
          <Link
            href={tenantUrl('/auth/access/staff/login')}
            className="px-3.5 py-1.5 rounded bg-primary text-white text-xs font-semibold"
          >
            Go to Staff Login
          </Link>
        </div>
      </div>
    );
  }

  const payGrade = staff.payGrade;
  const experiences = staff.experiences || [];
  const activeSessions = staff.activeSessions || [];
  const permissionKeys = Object.keys(permissions);

  const basicSalary = Number(payGrade?.basic_salary || 0);
  const allowance = Number(payGrade?.allowance || 0);
  const grossMonthly = basicSalary + allowance;

  return (
    <div className="w-full space-y-5">
      
      {/* Profile Header Hero Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar / Photo / Initials */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-700 dark:text-slate-200 font-semibold text-xl uppercase font-mono shadow-inner">
              {staff.image ? (
                <img
                  src={staff.image}
                  alt={staff.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                staff.name?.slice(0, 2) || 'ST'
              )}
            </div>

            {/* Identity & Status */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {staff.name}
                </h1>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {staff.gradeName || staff.designation || 'Staff Member'}
                </span>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                  staff.isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                }`}>
                  {staff.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Email: <strong className="text-slate-700 dark:text-slate-200 font-medium">{staff.email}</strong></span>
                <span>Phone: <strong className="text-slate-700 dark:text-slate-200 font-medium">{staff.number || staff.phone || 'N/A'}</strong></span>
                {staff.username && (
                  <span>Username: <strong className="text-slate-700 dark:text-slate-200 font-mono">@{staff.username}</strong></span>
                )}
                <span>Campus: <strong className="text-slate-700 dark:text-slate-200 font-medium">{website?.name || 'Main Campus'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Edit Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/staff-panel/staff-settings"
              className="px-3.5 py-2 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition shadow-xs inline-flex items-center gap-1.5"
            >
              <span>Edit Staff Settings</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Bio preview if exists */}
        {staff.bio && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 italic">
            "{staff.bio}"
          </div>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Pay Grade &amp; Scale</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
              {payGrade?.name || 'Default Tier'}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              ${grossMonthly.toFixed(2)}/mo
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Authorized Modules</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {allowedModules.length}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400">Modules Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Prior Experiences</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white font-mono">
              {experiences.length}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Career Records</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">Two-Factor Security</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              {staff.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className={`text-[10px] font-semibold ${staff.isTwoFactorEnabled ? 'text-emerald-600' : 'text-amber-500'}`}>
              {staff.isTwoFactorEnabled ? 'Protected' : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0 overflow-x-auto text-xs font-medium">
        {[
          { key: 'overview', label: 'Personal Information' },
          { key: 'compensation', label: 'Pay Scale & Benefits' },
          { key: 'permissions', label: `Module Permissions (${allowedModules.length})` },
          { key: 'experiences', label: `Experience Log (${experiences.length})` },
          { key: 'sessions', label: `Active Sessions (${activeSessions.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2.5 rounded-t text-xs font-medium transition cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-2xs space-y-6">

        {/* TAB 1: Personal Information */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Personal Identification Dossier
              </h2>
              <span className="text-[11px] text-slate-400">Institutional ID: #{staff.id}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Legal Full Name</span>
                <p className="font-semibold text-slate-900 dark:text-white">{staff.name || 'N/A'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Official Staff Email</span>
                <p className="font-semibold text-slate-900 dark:text-white">{staff.email || 'N/A'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Contact Telephone</span>
                <p className="font-semibold text-slate-900 dark:text-white">{staff.number || staff.phone || 'N/A'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Username</span>
                <p className="font-semibold font-mono text-slate-900 dark:text-white">
                  {staff.username ? `@${staff.username}` : 'Not assigned'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Date of Birth</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {staff.date_of_birth ? new Date(staff.date_of_birth).toLocaleDateString() : 'Unspecified'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Gender</span>
                <p className="font-semibold capitalize text-slate-900 dark:text-white">{staff.gender || 'Unspecified'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Blood Group</span>
                <p className="font-semibold text-slate-900 dark:text-white">{staff.blood_group || 'Unspecified'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Nationality</span>
                <p className="font-semibold text-slate-900 dark:text-white">{staff.nationality || 'Unspecified'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">National ID (NID)</span>
                <p className="font-semibold font-mono text-slate-900 dark:text-white">{staff.nid_number || 'Unspecified'}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Residential Address</span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{staff.address || 'No residential address configured.'}</p>
            </div>
          </div>
        )}

        {/* TAB 2: Compensation & Pay Scale */}
        {activeTab === 'compensation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Institutional Pay Scale &amp; Remuneration
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Scale Code: G-{payGrade?.id || 'N/A'}</span>
            </div>

            {payGrade ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Assigned Grade</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{payGrade.name}</p>
                  <p className="text-[10px] text-slate-500">Official institutional pay band</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Basic Monthly Base</span>
                  <p className="text-base font-mono font-bold text-slate-900 dark:text-white">${basicSalary.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Contractual monthly base salary</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Allowances &amp; Benefits</span>
                  <p className="text-base font-mono font-bold text-slate-900 dark:text-white">${allowance.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Medical, transport &amp; utility allowances</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded text-xs text-amber-800 dark:text-amber-300">
                No formal pay grade has been associated with this staff member yet. Campus administration can assign an official pay grade from the operations roster.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Module Permissions Matrix */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Operational Module Authorization Matrix
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Granular control over operational desks and campus facilities based on your subscription package.
                </p>
              </div>
            </div>

            {permissionKeys.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-500 text-center py-8">
                No explicit module overrides found. This staff account operates with default administrative desk access.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
                <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5">Module Name</th>
                      <th className="px-3 py-2.5">Module Slug</th>
                      <th className="px-3 py-2.5 text-center">View (Read)</th>
                      <th className="px-3 py-2.5 text-center">Create</th>
                      <th className="px-3 py-2.5 text-center">Edit / Update</th>
                      <th className="px-3 py-2.5 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {permissionKeys.map((slug) => {
                      const perm = permissions[slug];
                      return (
                        <tr key={slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-white capitalize">
                            {perm.module_name || slug.replace(/-/g, ' ')}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {slug}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              perm.can_view ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}>
                              {perm.can_view ? 'Allowed' : 'Denied'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              perm.can_create ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}>
                              {perm.can_create ? 'Allowed' : 'Denied'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              perm.can_edit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}>
                              {perm.can_edit ? 'Allowed' : 'Denied'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              perm.can_delete ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}>
                              {perm.can_delete ? 'Allowed' : 'Denied'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Experience History */}
        {activeTab === 'experiences' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Professional Experience Records
              </h2>
              <Link
                href="/staff-panel/staff-settings"
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Add or Update Records
              </Link>
            </div>

            {experiences.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-500">
                No past professional employment records have been added to your profile.
                <div className="mt-2">
                  <Link href="/staff-panel/staff-settings" className="font-semibold text-primary hover:underline">
                    Click here to add your employment history in Staff Settings →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{exp.title}</span>
                        <span className="text-slate-400 font-mono">@</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{exp.organization}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                        {exp.start_date ? new Date(exp.start_date).toLocaleDateString() : 'N/A'} —{' '}
                        {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Active Security Sessions */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Active Staff Device Sessions
              </h2>
              <span className="text-[10px] text-slate-400">Total Active: {activeSessions.length}</span>
            </div>

            <div className="space-y-2">
              {activeSessions.map((sess, idx) => (
                <div
                  key={sess.id || idx}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {sess.ip_address || '127.0.0.1'}
                      </span>
                      {sess.is_current_session && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-md">{sess.user_agent || 'Standard Web Browser'}</p>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 shrink-0 sm:text-right">
                    <span>Last active: {sess.last_active_at ? new Date(sess.last_active_at).toLocaleString() : 'Just now'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

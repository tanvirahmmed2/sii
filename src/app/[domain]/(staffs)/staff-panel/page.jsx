'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const AdminHomePage = () => {
  const params = useParams();
  const domain = params?.domain || '';
  const { getApiEndpoint } = useTenantWebsite();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchDashboard = async () => {
      try {
        const endpoint = getApiEndpoint
          ? getApiEndpoint('staff/panel/dashboard')
          : (domain ? `/api/${domain}/staff/panel/dashboard` : '/api/staff/panel/dashboard');

        const res = await fetch(endpoint);
        if (ignore) return;
        if (res.ok) {
          const json = await res.json();
          const stats = json.payload?.stats || json.paylod?.stats || json.stats;
          if (stats) setData(stats);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard statistics:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint, domain]);

  const stats = data || {};
  const admissions = stats.admissions || { total: 0, pending: 0, approved: 0 };
  const finance = stats.finance || { totalIncome: 0, totalExpenses: 0, netBalance: 0 };

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return <TenantLoader fullScreen={false} />;
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-12">
      {/* Top Banner Header */}
      <div className="w-full bg-slate-900 text-white rounded p-6 md:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">• {todayDate}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white">
            Staff Operations Control
          </h1>
          <p className="text-slate-400 text-xs max-w-xl">
            Monitor active campus metrics, admissions, financial ledgers, and operational activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10 w-full md:w-auto">
          <Link
            href="/staff-panel/student-data"
            className="flex-1 md:flex-none inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-3.5 py-2 rounded text-xs font-medium transition-colors"
          >
            Manage Students
          </Link>
          <Link
            href="/staff-panel/settings"
            className="flex-1 md:flex-none inline-flex items-center justify-center bg-white/10 hover:bg-white/15 text-white border border-white/10 px-3.5 py-2 rounded text-xs font-medium transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stat 1: Total Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Students
            </span>
            <span className="text-[10px] font-mono text-slate-400">STUDENTS</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {stats.totalStudents ? stats.totalStudents.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-medium mt-0.5">
              Enrolled Active Students
            </p>
          </div>
        </div>

        {/* Stat 2: Total Teachers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Faculty Members
            </span>
            <span className="text-[10px] font-mono text-slate-400">TEACHERS</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {stats.totalTeachers ? stats.totalTeachers.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-medium mt-0.5">
              Verified Teachers
            </p>
          </div>
        </div>

        {/* Stat 3: Total Staff */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Support Staff
            </span>
            <span className="text-[10px] font-mono text-slate-400">STAFF</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {stats.totalStaff ? stats.totalStaff.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-medium mt-0.5">
              Operations &amp; Desks
            </p>
          </div>
        </div>

        {/* Stat 4: Academic Classes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Academic Classes
            </span>
            <span className="text-[10px] font-mono text-slate-400">CLASSES</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {stats.totalClasses ? stats.totalClasses.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-medium mt-0.5">
              Active Classes &amp; Sections
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Admissions Overview */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Admissions Overview</h3>
            <Link
              href="/staff-panel/admission-applicants"
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              View Admissions →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                Total Applications
              </p>
              <p className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{admissions.total}</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200/60 dark:border-amber-800/40">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wider">
                Pending Review
              </p>
              <p className="text-xl font-semibold text-amber-700 dark:text-amber-400 mt-1">{admissions.pending}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200/60 dark:border-emerald-800/40">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wider">
                Approved
              </p>
              <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1">{admissions.approved}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Admission Processing Rate</span>
              <span>
                {admissions.total > 0 ? Math.round((admissions.approved / admissions.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-primary rounded transition-all duration-500"
                style={{
                  width: `${admissions.total > 0 ? Math.round((admissions.approved / admissions.total) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Finance Overview */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Financial Overview</h3>
            <Link
              href="/staff-panel/payment-education-list"
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              Fee Ledgers →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200/60 dark:border-emerald-800/40">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wider">
                Total Collections
              </p>
              <p className="text-base md:text-lg font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                ৳{finance.totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200/60 dark:border-rose-800/40">
              <p className="text-[10px] text-rose-700 dark:text-rose-400 font-medium uppercase tracking-wider">
                Expenses
              </p>
              <p className="text-base md:text-lg font-semibold text-rose-700 dark:text-rose-400 mt-1">
                ৳{finance.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200/60 dark:border-slate-800">
              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium uppercase tracking-wider">
                Net Balance
              </p>
              <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mt-1">
                ৳{finance.netBalance.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Aggregated cashier records &amp; fee transactions</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Audit Status: Verified</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
          Shortcuts &amp; Operations
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            href="/staff-panel/class-setup"
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded flex flex-col items-center justify-center text-center gap-1 transition-colors group cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Classes</span>
            <span className="text-[10px] text-slate-400">Class Setup</span>
          </Link>

          <Link
            href="/staff-panel/teacher-list"
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded flex flex-col items-center justify-center text-center gap-1 transition-colors group cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Teachers</span>
            <span className="text-[10px] text-slate-400">Faculty Registry</span>
          </Link>

          <Link
            href="/staff-panel/admission-applicants"
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded flex flex-col items-center justify-center text-center gap-1 transition-colors group cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Admissions</span>
            <span className="text-[10px] text-slate-400">Applications</span>
          </Link>

          <Link
            href="/staff-panel/events"
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded flex flex-col items-center justify-center text-center gap-1 transition-colors group cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Events</span>
            <span className="text-[10px] text-slate-400">Schedule</span>
          </Link>

          <Link
            href="/staff-panel/payment-education-list"
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded flex flex-col items-center justify-center text-center gap-1 transition-colors group cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Fees &amp; Ledgers</span>
            <span className="text-[10px] text-slate-400">Transactions</span>
          </Link>

          <Link
            href="/staff-panel/settings"
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded flex flex-col items-center justify-center text-center gap-1 transition-colors group cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Site Settings</span>
            <span className="text-[10px] text-slate-400">Configuration</span>
          </Link>
        </div>
      </div>

      {/* Data Tables Row: Recent Admissions & Security Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Admissions Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
              Recent Admission Applications
            </h3>
            <Link
              href="/staff-panel/admission-applicants"
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              View All →
            </Link>
          </div>

          {stats.recentAdmissions && stats.recentAdmissions.length > 0 ? (
            <div className="w-full overflow-x-auto border border-slate-100 dark:border-slate-800 rounded">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {stats.recentAdmissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                        {adm.student_name || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                        {adm.guardian_phone || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-400 dark:text-slate-500 font-mono">
                        {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize border ${
                          adm.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
                        }`}>
                          {adm.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400 text-xs italic text-center py-6">No recent admissions found.</p>
          )}
        </div>

        {/* Security & System Activity Logs */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded shadow-2xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
              Security Login Logs
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
              Live Feed
            </span>
          </div>

          {stats.loginLogs && stats.loginLogs.length > 0 ? (
            <div className="flex flex-col gap-2">
              {stats.loginLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-white truncate max-w-[200px]">
                      {log.user_email || 'User'}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {log.user_type || 'Portal'} • {log.ip_address || '127.0.0.1'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {log.login_time ? new Date(log.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs italic text-center py-6">No login logs recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;
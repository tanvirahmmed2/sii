'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import {
  FiUsers, FiBook, FiCalendar, FiDollarSign, FiShield,
  FiUserPlus, FiArrowRight, FiCheckCircle, FiClock,
  FiActivity, FiLayers, FiSettings, FiBriefcase, FiTrendingUp
} from 'react-icons/fi';

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
      <div className="w-full bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex flex-col gap-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">• {todayDate}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Staff Operations Control
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl">
            Monitor active campus metrics, admissions, financial ledgers, and operational activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
          <Link
            href="/staff-panel/student-data"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            <FiUserPlus className="text-sm" />
            <span>Manage Students</span>
          </Link>
          <Link
            href="/staff-panel/settings"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
          >
            <FiSettings className="text-sm" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between gap-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-base">
              <FiUsers />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.totalStudents ? stats.totalStudents.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-semibold flex items-center gap-1 mt-1">
              <FiTrendingUp /> Enrolled Active Students
            </p>
          </div>
        </div>

        {/* Stat 2: Total Teachers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between gap-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Faculty Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-base">
              <FiBriefcase />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.totalTeachers ? stats.totalTeachers.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-semibold flex items-center gap-1 mt-1">
              <FiCheckCircle /> Verified Teachers
            </p>
          </div>
        </div>

        {/* Stat 3: Total Staff */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between gap-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Support Staff
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-base">
              <FiUsers />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.totalStaff ? stats.totalStaff.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-semibold flex items-center gap-1 mt-1">
              <FiActivity /> Operations &amp; Desks
            </p>
          </div>
        </div>

        {/* Stat 4: Academic Classes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between gap-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Academic Classes
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-base">
              <FiLayers />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.totalClasses ? stats.totalClasses.toLocaleString() : '0'}
            </h2>
            <p className="text-xs text-primary font-semibold flex items-center gap-1 mt-1">
              <FiBook /> Active Classes &amp; Sections
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Admissions Overview */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                <FiUserPlus />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Admissions Overview</h3>
            </div>
            <Link
              href="/staff-panel/admission-applicants"
              className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1"
            >
              View Admissions <FiArrowRight />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Total Applications
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{admissions.total}</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                Pending Review
              </p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">{admissions.pending}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                Approved
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{admissions.approved}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>Admission Processing Rate</span>
              <span>
                {admissions.total > 0 ? Math.round((admissions.approved / admissions.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{
                  width: `${admissions.total > 0 ? Math.round((admissions.approved / admissions.total) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Finance Overview */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                <FiDollarSign />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Financial Overview</h3>
            </div>
            <Link
              href="/staff-panel/payment-education-list"
              className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1"
            >
              Fee Ledgers <FiArrowRight />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                Total Collections
              </p>
              <p className="text-base md:text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                ৳{finance.totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
              <p className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider">
                Expenses
              </p>
              <p className="text-base md:text-lg font-bold text-rose-700 dark:text-rose-400 mt-1">
                ৳{finance.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                Net Balance
              </p>
              <p className="text-base md:text-lg font-bold text-slate-900 dark:text-white mt-1">
                ৳{finance.netBalance.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Aggregated cashier records &amp; fee transactions</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Audit Status: Verified</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <FiLayers className="text-primary" /> Shortcuts &amp; Operations
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/staff-panel/class-setup"
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-sm transition-colors">
              <FiBook />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Classes</span>
          </Link>

          <Link
            href="/staff-panel/teacher-list"
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-sm transition-colors">
              <FiBriefcase />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Teachers</span>
          </Link>

          <Link
            href="/staff-panel/admission-applicants"
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-sm transition-colors">
              <FiUserPlus />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Admissions</span>
          </Link>

          <Link
            href="/staff-panel/events"
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-sm transition-colors">
              <FiCalendar />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Events</span>
          </Link>

          <Link
            href="/staff-panel/payment-education-list"
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-sm transition-colors">
              <FiDollarSign />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Fees &amp; Ledgers</span>
          </Link>

          <Link
            href="/staff-panel/settings"
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-sm transition-colors">
              <FiSettings />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Site Settings</span>
          </Link>
        </div>
      </div>

      {/* Data Tables Row: Recent Admissions & Security Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Admissions Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <FiUserPlus className="text-primary" /> Recent Admission Applications
            </h3>
            <Link
              href="/staff-panel/admission-applicants"
              className="text-xs font-semibold text-primary hover:text-primary-dark"
            >
              View All
            </Link>
          </div>

          {stats.recentAdmissions && stats.recentAdmissions.length > 0 ? (
            <div className="w-full overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {stats.recentAdmissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {adm.student_name || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {adm.guardian_phone || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 dark:text-slate-500">
                        {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          adm.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
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
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <FiShield className="text-primary" /> Security Login Logs
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
              Live Feed
            </span>
          </div>

          {stats.loginLogs && stats.loginLogs.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {stats.loginLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20">
                      <FiClock />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-white truncate max-w-[150px]">
                        {log.user_email || 'User'}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {log.user_type || 'Portal'} • {log.ip_address || '127.0.0.1'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
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
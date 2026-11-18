'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function SmsBalancePage() {
  const { website, getApiEndpoint } = useTenantWebsite();
  const [isPending, startTransition] = useTransition();

  const getCurrentMonthString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [recipientType, setRecipientType] = useState('all');
  const [messageType, setMessageType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLog, setActiveLog] = useState(null);

  const fetchBalanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        month: selectedMonth,
        page: String(page),
        limit: '20',
      });

      if (recipientType !== 'all') params.set('recipient_type', recipientType);
      if (messageType !== 'all') params.set('type', messageType);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const url = `${getApiEndpoint('staff/panel/sms-balance')}?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve SMS balance analytics.');
      }

      setAnalytics(data.analytics || null);
      setHistory(data.history || []);
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, page, recipientType, messageType, statusFilter, searchQuery, getApiEndpoint]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          month: selectedMonth,
          page: String(page),
          limit: '20',
        });

        if (recipientType !== 'all') params.set('recipient_type', recipientType);
        if (messageType !== 'all') params.set('type', messageType);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());

        const url = `${getApiEndpoint('staff/panel/sms-balance')}?${params.toString()}`;
        const res = await fetch(url);
        const data = await res.json();

        if (ignore) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to retrieve SMS balance analytics.');
        }

        setAnalytics(data.analytics || null);
        setHistory(data.history || []);
        setLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [selectedMonth, page, recipientType, messageType, statusFilter, searchQuery, getApiEndpoint]);

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    startTransition(() => {
      setRecipientType('all');
      setMessageType('all');
      setStatusFilter('all');
      setSearchQuery('');
      setPage(1);
    });
  };

  const quota = analytics?.monthlyQuota || 200;
  const used = analytics?.usedSms || 0;
  const balance = analytics?.remainingSms ?? Math.max(0, quota - used);
  const usagePct = analytics?.usagePercentage ?? (quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0);

  const roles = analytics?.roleBreakdown || {};
  const types = analytics?.typeBreakdown || {};

  const roleLabels = [
    { key: 'student', label: 'Students', color: 'bg-emerald-500' },
    { key: 'teacher', label: 'Teachers', color: 'bg-sky-500' },
    { key: 'officer', label: 'Officers', color: 'bg-indigo-500' },
    { key: 'staff', label: 'Staff Members', color: 'bg-purple-500' },
    { key: 'applicant', label: 'Applicants', color: 'bg-amber-500' },
    { key: 'other', label: 'Others / System', color: 'bg-slate-400' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              SMS Balance &amp; Monthly Usage
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {analytics?.packageName || 'Plan Tier'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Realtime institutional SMS quota analytics, monthly balance, recipient breakdown, and dispatch archive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 shadow-2xs">
            <label htmlFor="sms-month-picker" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Billing Month:
            </label>
            <input
              id="sms-month-picker"
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="text-xs font-semibold text-slate-900 dark:text-white bg-transparent outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => fetchBalanceData()}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
          >
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${analytics?.redisConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {analytics?.redisConnected
              ? 'Redis Realtime Engine Active'
              : 'Postgres Direct Mode Active'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 dark:text-slate-400">
            Cycle: <strong className="text-slate-800 dark:text-slate-200">{selectedMonth}</strong>
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Reset Schedule: 1st of every calendar month
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Package Monthly Limit
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {quota.toLocaleString()} <span className="text-xs font-normal text-slate-400">SMS</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Monthly quota allowance included with active plan
          </p>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Consumed This Month
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {used.toLocaleString()} <span className="text-xs font-normal text-slate-400">SMS</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Total SMS parts dispatched during {selectedMonth}
          </p>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Remaining Available Balance
          </span>
          <div className={`text-2xl font-bold ${balance > 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {balance.toLocaleString()} <span className="text-xs font-normal text-slate-400">SMS</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Available for OTPs, notices, and communications
          </p>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Quota Consumption
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {usagePct}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${usagePct > 90 ? 'bg-rose-500' : usagePct > 70 ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, usagePct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {quota - used <= 0 ? 'Monthly limit reached' : `${balance} SMS remaining before renewal`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Distribution by Recipient Role
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total SMS dispatched grouped by recipient institutional category
            </p>
          </div>

          <div className="space-y-3">
            {roleLabels.map((role) => {
              const count = roles[role.key] || 0;
              const share = used > 0 ? Math.round((count / used) * 100) : 0;
              return (
                <div key={role.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {role.label}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {count.toLocaleString()} SMS ({share}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${role.color}`}
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Distribution by Message Purpose
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Volume categorized by operational and security purposes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Security &amp; 2FA OTP</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {((types['2fa'] || 0) + (types['otp'] || 0)).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Auth verification codes</span>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Account Recovery</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {(types['recovery'] || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Password reset OTPs</span>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Account Verification</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {(types['verification'] || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Registration activation</span>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Notices &amp; Alerts</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {((types['notice'] || 0) + (types['general'] || 0) + (types['notification'] || 0)).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Campus circulars &amp; reminders</span>
            </div>
          </div>

          {history.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 block mb-2">
                Recent Monthly History
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {history.map((h) => (
                  <button
                    key={h.year_month}
                    onClick={() => {
                      setSelectedMonth(h.year_month);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors shrink-0 ${
                      selectedMonth === h.year_month
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {h.year_month}: {h.sms_count} SMS
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sent SMS Logs &amp; Audit Trail
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Detailed registry of messages dispatched to students, teachers, officers, and staff
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Total records: {pagination.total}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <div>
            <label htmlFor="sms-search-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Search Details
            </label>
            <input
              id="sms-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="sms-role-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Recipient Role
            </label>
            <select
              id="sms-role-select"
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Recipient Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="officer">Officers</option>
              <option value="staff">Staff Members</option>
              <option value="applicant">Applicants</option>
              <option value="other">System / Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="sms-type-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Message Purpose
            </label>
            <select
              id="sms-type-select"
              value={messageType}
              onChange={(e) => {
                setMessageType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Purposes</option>
              <option value="2fa">Two-Factor OTP</option>
              <option value="otp">Verification OTP</option>
              <option value="recovery">Password Recovery</option>
              <option value="verification">Account Setup</option>
              <option value="notice">Notices &amp; Decrees</option>
              <option value="general">General Notification</option>
            </select>
          </div>

          <div>
            <label htmlFor="sms-status-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Delivery Status
            </label>
            <select
              id="sms-status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="Sent">Sent / Delivered</option>
              <option value="Simulated">Simulated (Dev)</option>
              <option value="Failed">Failed Dispatch</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full text-xs py-2 px-3 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Dispatched At</th>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Purpose</th>
                <th className="py-2.5 px-3">Message Snippet</th>
                <th className="py-2.5 px-3">Parts</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading SMS dispatch records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No SMS dispatch records found matching criteria for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                logs.map((row) => {
                  const dateStr = new Date(row.created_at).toLocaleString();
                  const isSent = row.status?.toLowerCase() === 'sent';
                  const isSim = row.status?.toLowerCase() === 'simulated';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {row.recipient_name || 'Designated Contact'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {row.recipient_identifier}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {row.recipient_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          {row.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 dark:text-slate-300 font-sans">
                        {row.message}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {row.parts_count || 1}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isSent
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : isSim
                              ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setActiveLog(row)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs font-medium disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-800 text-xs font-medium disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {activeLog && (
        <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              SMS Dispatch Inspection — ID #{activeLog.id}
            </h3>
            <button
              onClick={() => setActiveLog(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Recipient</span>
              <strong className="text-slate-800 dark:text-slate-200">{activeLog.recipient_name || 'Designated Contact'}</strong>
              <div className="font-mono text-slate-500">{activeLog.recipient_identifier}</div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Role &amp; Purpose</span>
              <span className="text-slate-800 dark:text-slate-200 capitalize font-medium">{activeLog.recipient_type}</span>
              <div className="text-primary font-mono">{activeLog.type}</div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Gateway Provider</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono uppercase">{activeLog.provider || 'zendsms'}</span>
              <div className="text-slate-500">{new Date(activeLog.created_at).toLocaleString()}</div>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] mb-1">Message Content</span>
            <div className="p-3 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {activeLog.message}
            </div>
          </div>

          {activeLog.failure_reason && (
            <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-mono">
              Failure Log: {activeLog.failure_reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

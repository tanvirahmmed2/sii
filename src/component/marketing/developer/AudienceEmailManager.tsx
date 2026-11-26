'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FiMail,
  FiSend,
  FiUsers,
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiDatabase,
  FiList,
} from 'react-icons/fi';
import LoadingScreen from 'src/component/common/LoadingScreen';
import type { EmailAudience } from 'src/lib/redis/platformEmailQueue';

interface AudienceEmailManagerProps {
  audience: EmailAudience;
  title: string;
  subtitle: string;
}

const EMAIL_MODULE_TABS: Array<{ audience: string; label: string; href: string }> = [
  { audience: 'creators', label: 'Creators', href: '/developer/email-creators' },
  { audience: 'subscribers', label: 'Subscribers', href: '/developer/email-subscribers' },
  { audience: 'developers', label: 'Developers', href: '/developer/email-developers' },
  { audience: 'leads', label: 'Leads', href: '/developer/email-leads' },
  { audience: 'custom-email', label: 'Custom Email', href: '/developer/custom-email' },
];

export default function AudienceEmailManager({
  audience,
  title,
  subtitle,
}: AudienceEmailManagerProps) {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRecipients: 0,
    activeRecipients: 0,
    sentThisMonth: 0,
    failedThisMonth: 0,
    redisConnected: false,
    totalLogs: 0,
  });
  const [dataSource, setDataSource] = useState<string>('database');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recipients' | 'logs' | 'campaigns'>('recipients');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showComposePanel, setShowComposePanel] = useState(true);
  const [targetMode, setTargetMode] = useState<'all_active' | 'selected' | 'custom'>('all_active');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [purpose, setPurpose] = useState('broadcast');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(
    async (forceRefresh: boolean = false) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/marketing/developer/emails/${audience}${forceRefresh ? '?refresh=true' : ''}`
        );
        const data = await res.json();
        if (data.success) {
          setRecipients(data.recipients || []);
          setLogs(data.logs || []);
          setCampaigns(data.campaigns || []);
          setDataSource(data.source || 'database');
          if (data.stats) setStats(data.stats);
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to load email module data.' });
        }
      } catch {
        setMessage({ type: 'error', text: 'Network error loading email module.' });
      } finally {
        setLoading(false);
      }
    },
    [audience]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const q = searchQuery.trim().toLowerCase();

  const filteredRecipients = useMemo(() => {
    return recipients.filter(
      (r) =>
        !q ||
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.email || '').toLowerCase().includes(q) ||
        String(r.meta || '').toLowerCase().includes(q) ||
        String(r.status || '').toLowerCase().includes(q)
    );
  }, [recipients, q]);

  const filteredLogs = useMemo(() => {
    return logs.filter(
      (l) =>
        !q ||
        String(l.recipient || '').toLowerCase().includes(q) ||
        String(l.recipient_name || '').toLowerCase().includes(q) ||
        String(l.subject || '').toLowerCase().includes(q) ||
        String(l.status || '').toLowerCase().includes(q)
    );
  }, [logs, q]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(
      (c) =>
        !q ||
        String(c.id || '').toLowerCase().includes(q) ||
        String(c.subject || '').toLowerCase().includes(q) ||
        String(c.status || '').toLowerCase().includes(q)
    );
  }, [campaigns, q]);

  const toggleSelectRecipient = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setTargetMode('selected');
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredRecipients
      .map((r) => Number(r.id))
      .filter((id) => !Number.isNaN(id) && id > 0);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
      setTargetMode('selected');
    }
  };

  const handleQuickEmailRecipient = (rec: any) => {
    if (!rec?.email) return;
    setShowComposePanel(true);
    setTargetMode('custom');
    setCustomEmails(rec.email);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!subject.trim() || !emailBody.trim()) {
      setMessage({ type: 'error', text: 'Email subject and message body are required.' });
      return;
    }
    if (targetMode === 'selected' && selectedIds.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one recipient from the table.' });
      return;
    }
    if (targetMode === 'custom' && !customEmails.trim()) {
      setMessage({ type: 'error', text: 'Enter one or more target email addresses.' });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/marketing/developer/emails/${audience}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          message: emailBody.trim(),
          ctaLabel: ctaLabel.trim() || null,
          ctaUrl: ctaUrl.trim() || null,
          purpose,
          targetMode,
          recipientIds: targetMode === 'selected' ? selectedIds : undefined,
          customEmails: targetMode === 'custom' ? customEmails.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text:
            data.message ||
            `Sent ${data.sentCount || 0} email(s) successfully.`,
        });
        setSubject('');
        setEmailBody('');
        setCtaLabel('');
        setCtaUrl('');
        setSelectedIds([]);
        await fetchData(true);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email campaign.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error while dispatching emails.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <FiMail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
                {title}
              </h1>
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                  stats.redisConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                }`}
              >
                {stats.redisConnected ? `Redis Queue (${dataSource})` : 'Redis Standby'}
              </span>
            </div>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowComposePanel(!showComposePanel)}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer flex items-center gap-1.5"
          >
            {showComposePanel ? <FiX className="w-3.5 h-3.5" /> : <FiSend className="w-3.5 h-3.5" />}
            {showComposePanel ? 'Hide Composer' : 'Compose Email'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        {EMAIL_MODULE_TABS.map((tab) => {
          const isActive = tab.audience === audience;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {message && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded border text-xs font-normal ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <FiCheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <FiXCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Active Recipients</span>
            <FiUsers className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {stats.activeRecipients}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Total directory: {stats.totalRecipients}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Delivered This Month</span>
            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
            {stats.sentThisMonth}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Failed: {stats.failedThisMonth}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Redis Queue Status</span>
            <FiDatabase className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {stats.redisConnected ? 'Connected' : 'Fallback'}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Recent campaigns: {campaigns.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-normal">Email Audit Logs</span>
            <FiList className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {stats.totalLogs}
          </div>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Stored in email_logs
          </p>
        </div>
      </div>

      {showComposePanel && (
        <form
          onSubmit={handleSendEmail}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Send Email to {audience.charAt(0).toUpperCase() + audience.slice(1)}
              </h2>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Dispatches are queued through Redis and persisted in PostgreSQL email_logs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowComposePanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor={`targetMode-${audience}`}
                className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
              >
                Target Audience
              </label>
              <select
                id={`targetMode-${audience}`}
                value={targetMode}
                onChange={(e) =>
                  setTargetMode(e.target.value as 'all_active' | 'selected' | 'custom')
                }
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="all_active">
                  All Active ({stats.activeRecipients})
                </option>
                <option value="selected">
                  Selected Recipients ({selectedIds.length})
                </option>
                <option value="custom">Specific Email Address(es)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`purpose-${audience}`}
                className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
              >
                Email Purpose
              </label>
              <select
                id={`purpose-${audience}`}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                <option value="broadcast">Announcement / Broadcast</option>
                <option value="newsletter">Newsletter</option>
                <option value="platform_update">Product Update</option>
                <option value="direct">Direct Communication</option>
                <option value="promotion">Offer / Promotion</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`subject-${audience}`}
                className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
              >
                Email Subject
              </label>
              <input
                id={`subject-${audience}`}
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {targetMode === 'custom' && (
            <div>
              <label
                htmlFor={`customEmails-${audience}`}
                className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
              >
                Recipient Email Addresses (Comma or Space Separated)
              </label>
              <input
                id={`customEmails-${audience}`}
                type="text"
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          )}

          <div>
            <label
              htmlFor={`body-${audience}`}
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Message Content
            </label>
            <textarea
              id={`body-${audience}`}
              rows={5}
              required
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`ctaLabel-${audience}`}
                className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
              >
                Optional Action Button Text
              </label>
              <input
                id={`ctaLabel-${audience}`}
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label
                htmlFor={`ctaUrl-${audience}`}
                className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
              >
                Optional Action Button URL
              </label>
              <input
                id={`ctaUrl-${audience}`}
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowComposePanel(false)}
              className="px-3.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <FiSend className="w-3.5 h-3.5" />
              {sending ? 'Dispatching via Redis...' : 'Queue & Send Email'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="w-full lg:max-w-md">
            <label
              htmlFor={`emailSearch-${audience}`}
              className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1"
            >
              Search Recipients, Logs &amp; Campaigns
            </label>
            <div className="relative">
              <FiSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id={`emailSearch-${audience}`}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-normal text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('recipients')}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                activeTab === 'recipients'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Recipients ({filteredRecipients.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Email Logs ({filteredLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                activeTab === 'campaigns'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Redis Queue Runs ({filteredCampaigns.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-2">
          {loading ? (
            <div className="py-8">
              <LoadingScreen fullScreen={false} size="sm" label="Loading directory and logs..." />
            </div>
          ) : activeTab === 'recipients' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all recipients"
                      checked={
                        filteredRecipients.length > 0 &&
                        filteredRecipients.every((r) => selectedIds.includes(Number(r.id)))
                      }
                      onChange={toggleSelectAllFiltered}
                      className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-normal">
                      No recipients found.
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((rec) => {
                    const id = Number(rec.id);
                    const checked = selectedIds.includes(id);
                    return (
                      <tr
                        key={`${rec.id}-${rec.email}`}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectRecipient(id)}
                            className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {rec.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {rec.email}
                        </td>
                        <td className="py-2.5 px-3 font-normal text-slate-500 dark:text-slate-400">
                          {rec.meta || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                              rec.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleQuickEmailRecipient(rec)}
                            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer"
                          >
                            Email
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'logs' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-normal">
                      No email dispatch logs found for this audience yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {log.recipient_name || log.recipient}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {log.recipient}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-700 dark:text-slate-300 max-w-sm truncate">
                        {log.subject}
                      </td>
                      <td className="py-2.5 px-3 font-normal text-slate-500 dark:text-slate-400 capitalize">
                        {String(log.purpose || 'general').replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                            String(log.status).toLowerCase() === 'failed'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Engine</th>
                  <th className="py-2.5 px-3 text-right">Sent / Total</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-normal">
                      No queued campaign runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((camp) => (
                    <tr
                      key={camp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {camp.created_at ? new Date(camp.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {camp.subject}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-medium uppercase">
                          {camp.engine}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white">
                        {camp.sent} / {camp.total}
                        {camp.failed > 0 ? ` (${camp.failed} failed)` : ''}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium capitalize">
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

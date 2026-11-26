'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  FiMail,
  FiSend,
  FiRefreshCw,
  FiSearch,
  FiPaperclip,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiTrash2,
  FiDownload,
  FiEye,
} from 'react-icons/fi';
import LoadingScreen from 'src/component/common/LoadingScreen';

const EMAIL_MODULE_TABS = [
  { key: 'creators', label: 'Creators', href: '/developer/email-creators' },
  { key: 'subscribers', label: 'Subscribers', href: '/developer/email-subscribers' },
  { key: 'developers', label: 'Developers', href: '/developer/email-developers' },
  { key: 'leads', label: 'Leads', href: '/developer/email-leads' },
  { key: 'custom-email', label: 'Custom Email', href: '/developer/custom-email' },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CustomEmailPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCustomEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketing/developer/custom-email');
      const data = await res.json();
      if (data.success) {
        setEmails(Array.isArray(data.emails) ? data.emails : []);
        setCanCreate(Boolean(data.canCreate));
        setCanDelete(Boolean(data.canDelete));
      } else {
        setNotice({ type: 'error', text: data.error || 'Failed to load custom email records.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error loading custom email history.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomEmails();
  }, [fetchCustomEmails]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    setAttachments((prev) => {
      const combined = [...prev, ...selected];
      if (combined.length > 5) {
        setNotice({ type: 'error', text: 'Maximum 5 attachments allowed per email.' });
        return combined.slice(0, 5);
      }
      return combined;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!toEmail.trim() || !subject.trim() || !description.trim()) {
      setNotice({ type: 'error', text: 'To email, subject, and description are required.' });
      return;
    }

    const totalSize = attachments.reduce((sum, file) => sum + (file.size || 0), 0);
    if (totalSize > 10 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Total attachment size cannot exceed 10 MB.' });
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', toEmail.trim());
      formData.append('subject', subject.trim());
      formData.append('description', description.trim());
      for (const file of attachments) {
        formData.append('attachments', file);
      }

      const res = await fetch('/api/marketing/developer/custom-email', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', text: data.message || 'Email sent via Brevo successfully.' });
        setToEmail('');
        setSubject('');
        setDescription('');
        setAttachments([]);
        await fetchCustomEmails();
      } else {
        setNotice({ type: 'error', text: data.error || 'Failed to send email.' });
        await fetchCustomEmails();
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error sending email.' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/custom-email?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', text: 'Email record deleted.' });
        if (selectedEmail?.id === id) setSelectedEmail(null);
        await fetchCustomEmails();
      } else {
        setNotice({ type: 'error', text: data.error || 'Failed to delete record.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Network error deleting record.' });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter(
      (item) =>
        String(item.to_email || '').toLowerCase().includes(q) ||
        String(item.subject || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q) ||
        String(item.status || '').toLowerCase().includes(q)
    );
  }, [emails, searchQuery]);

  return (
    <div className="w-full space-y-4 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <FiMail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
              Custom Email
            </h1>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
              Send direct emails to any recipient via Brevo mailer with attachments and store sent history in database.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCustomEmails}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        {EMAIL_MODULE_TABS.map((tab) => {
          const isActive = tab.key === 'custom-email';
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

      {notice && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded border text-xs font-normal ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <FiCheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <FiXCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {canCreate && (
        <form
          onSubmit={handleSend}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">
              Compose Custom Email (Brevo Mailer)
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Separate multiple recipient emails with commas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                To *
              </label>
              <input
                type="text"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Description *
            </label>
            <textarea
              rows={6}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 resize-y"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Attachments (Optional, max 5 files / 10 MB total)
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <FiPaperclip className="w-3.5 h-3.5" />
                <span>Select Files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs"
                  >
                    <FiPaperclip className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[200px] text-slate-800 dark:text-slate-200">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({formatBytes(file.size)})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={sending || !toEmail.trim() || !subject.trim() || !description.trim()}
              className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <FiSend className="w-3.5 h-3.5" />
              <span>{sending ? 'Sending...' : 'Send Email'}</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="font-medium text-slate-900 dark:text-white">
            Sent Custom Emails ({filteredEmails.length})
          </div>
          <div className="relative w-full sm:w-72">
            <FiSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search sent custom emails"
              className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-medium text-[10px]">
                <th className="px-4 py-2.5 whitespace-nowrap">To</th>
                <th className="px-4 py-2.5">Subject &amp; Description</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Attachments</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Sent At</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <LoadingScreen fullScreen={false} size="sm" label="Loading custom email records..." />
                  </td>
                </tr>
              ) : filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No custom emails sent yet.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((item) => {
                  const statusLower = String(item.status || '').toLowerCase();
                  const isSuccess = statusLower === 'sent';
                  const isSim = statusLower === 'simulated';
                  const attList = Array.isArray(item.attachments) ? item.attachments : [];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {item.to_email}
                      </td>
                      <td className="px-4 py-2.5 max-w-md">
                        <div className="font-medium text-slate-900 dark:text-white truncate">
                          {item.subject}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.description}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {attList.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {attList.map((att: any) => (
                              <a
                                key={att.index}
                                href={`/api/marketing/developer/custom-email?downloadAttachment=1&emailId=${item.id}&index=${att.index}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 hover:underline"
                              >
                                <FiDownload className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[120px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : isSim
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEmail(item)}
                            className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 cursor-pointer disabled:opacity-50"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-lg w-full p-5 space-y-4 shadow-lg">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedEmail.subject}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  To: {selectedEmail.to_email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {selectedEmail.description}
            </div>

            {Array.isArray(selectedEmail.attachments) && selectedEmail.attachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Attachments
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedEmail.attachments.map((att: any) => (
                    <a
                      key={att.index}
                      href={`/api/marketing/developer/custom-email?downloadAttachment=1&emailId=${selectedEmail.id}&index=${att.index}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 hover:underline"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      <span>{att.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({formatBytes(Number(att.size || 0))})
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {selectedEmail.failure_reason && (
              <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px]">
                Error: {selectedEmail.failure_reason}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Status: {selectedEmail.status}</span>
              <span>
                {selectedEmail.created_at
                  ? new Date(selectedEmail.created_at).toLocaleString()
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

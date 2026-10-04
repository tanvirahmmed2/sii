'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiMail,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiUser,
  FiArrowRight,
  FiX,
  FiInbox,
} from 'react-icons/fi';
import { Context } from 'src/component/helper/Context';

export default function AdminContactsPage() {
  const router = useRouter();
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canReply = permissions.includes('contacts') || user?.role === 'admin' || user?.role === 'manager';
  const canDelete = permissions.includes('contacts') || user?.role === 'admin' || user?.role === 'manager';

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  const fetchContacts = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/contacts');
      const data = await res.json();
      if (data.success) {
        setContacts(data.records || []);
      }
    } catch (e) {
      console.error('Error loading contacts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts(true);
  }, [fetchContacts]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!canDelete) {
      notify('Permission denied: contacts permission required to delete inquiries.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this contact message? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/contacts/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        notify('Contact inquiry deleted successfully.');
        fetchContacts();
      } else {
        notify(data.error || 'Failed to delete contact.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Network error deleting contact.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Stats calculation
  const totalCount = contacts.length;
  const newCount = contacts.filter((c) => String(c.status || '').toLowerCase() === 'new').length;
  const inProgressCount = contacts.filter((c) => String(c.status || '').toLowerCase() === 'in_progress').length;
  const repliedCount = contacts.filter((c) => ['replied', 'resolved'].includes(String(c.status || '').toLowerCase())).length;

  const filtered = contacts.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    if (statusFilter !== 'ALL' && s !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.message?.toLowerCase().includes(q) ||
      c.institution?.toLowerCase().includes(q) ||
      c.reply?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    const s = String(status || 'new').toLowerCase();
    if (s === 'replied' || s === 'resolved') {
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
    if (s === 'in_progress') {
      return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    }
    if (s === 'read') {
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    }
    if (s === 'closed') {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
    return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? <FiAlertCircle className="w-4 h-4 shrink-0" /> : <FiCheckCircle className="w-4 h-4 shrink-0" />}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Contact Inquiries
            </h1>
            <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Inquiries
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            View public inquiries, compose mailer email replies on dedicated detail pages, and track lead conversations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchContacts(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            title="Refresh contacts"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Inquiries</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <FiMail className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">New / Unread</span>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{newCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FiClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">In Progress</span>
            <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{inProgressCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FiClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Replied</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{repliedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FiCheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Messages' },
              { id: 'NEW', label: 'New' },
              { id: 'READ', label: 'Read' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'REPLIED', label: 'Replied' },
              { id: 'CLOSED', label: 'Closed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search sender, email, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</span> of {contacts.length}
            </div>
          </div>
        </div>

        {/* Contacts Table (Desktop/Tablet) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-normal uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Sender</th>
                <th className="px-4 py-3">Subject &amp; Message</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Received</th>
                <th className="px-4 py-3 whitespace-nowrap">Reply Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    Loading contact inquiries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    No contact records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const s = String(c.status || 'new').toLowerCase();
                  const isReplied = s === 'replied' || s === 'resolved';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/developer/contacts/${c.id}`)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-slate-400">#{c.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <FiUser className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.name}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{c.email}</div>
                        {c.institution && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.institution}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{c.subject}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{c.message}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wider ${getStatusBadge(
                            c.status
                          )}`}
                        >
                          {c.status || 'new'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs text-[11px]">
                        {isReplied ? (
                          <div className="text-emerald-700 dark:text-emerald-400 truncate font-medium">
                            Replied by: {c.replied_by_name || 'Staff'}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Awaiting response</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/developer/contacts/${c.id}`}
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px]"
                          >
                            <span>{isReplied ? 'View' : 'Reply'}</span>
                            <FiArrowRight className="w-3 h-3" />
                          </Link>

                          {canDelete && (
                            <button
                              type="button"
                              disabled={deletingId === c.id}
                              onClick={(e) => handleDelete(c.id, e)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="Delete inquiry"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
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

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading contact inquiries...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No records found.</div>
          ) : (
            filtered.map((c) => {
              const s = String(c.status || 'new').toLowerCase();
              const isReplied = s === 'replied' || s === 'resolved';

              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/developer/contacts/${c.id}`)}
                  className="p-4 space-y-2.5 active:bg-slate-50 dark:active:bg-slate-800/40 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">#{c.id}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase ${getStatusBadge(
                        c.status
                      )}`}
                    >
                      {c.status || 'new'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{c.subject}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{c.message}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span> &bull;{' '}
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/developer/contacts/${c.id}`}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60"
                      >
                        {isReplied ? 'View' : 'Reply'} &rarr;
                      </Link>
                      {canDelete && (
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={(e) => handleDelete(c.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

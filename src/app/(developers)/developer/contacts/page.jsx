'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

export default function AdminContactsPage() {
  const router = useRouter();
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
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
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (s === 'in_progress') {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800';
    }
    if (s === 'read') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    }
    if (s === 'closed') {
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-medium transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Contact Inquiries
            </h1>
            <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              Inquiries
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View public inquiries, compose mailer email replies, and track lead conversations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchContacts(true)}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Total Inquiries</span>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400">New / Unread</span>
          <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{newCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400">In Progress</span>
          <div className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">{inProgressCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Replied</span>
          <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{repliedCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'NEW', label: 'New' },
              { id: 'READ', label: 'Read' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'REPLIED', label: 'Replied' },
              { id: 'CLOSED', label: 'Closed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search sender, email, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
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
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
                <th className="px-4 py-2.5 whitespace-nowrap">ID</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Sender</th>
                <th className="px-4 py-2.5">Subject &amp; Message</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Received</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Reply Status</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading contact inquiries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-400">#{c.id}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{c.email}</div>
                        {c.institution && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.institution}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 max-w-sm">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{c.subject}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{c.message}</div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border uppercase ${getStatusBadge(
                            c.status
                          )}`}
                        >
                          {c.status || 'new'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 max-w-xs text-[11px]">
                        {isReplied ? (
                          <div className="text-emerald-700 dark:text-emerald-400 truncate font-medium">
                            Replied by: {c.replied_by_name || 'Staff'}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Awaiting response</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/developer/contacts/${c.id}`}
                            className="text-slate-800 dark:text-slate-200 hover:underline font-medium text-xs px-2 py-1"
                          >
                            {isReplied ? 'View' : 'Reply'}
                          </Link>

                          {canDelete && (
                            <button
                              type="button"
                              disabled={deletingId === c.id}
                              onClick={(e) => handleDelete(c.id, e)}
                              className="text-rose-600 hover:text-rose-800 px-2 py-1 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Delete
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
                  className="p-4 space-y-2 active:bg-slate-50 dark:active:bg-slate-800/40 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">#{c.id}</span>
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${getStatusBadge(
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
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span> •{' '}
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/developer/contacts/${c.id}`}
                        className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:underline"
                      >
                        {isReplied ? 'View' : 'Reply'}
                      </Link>
                      {canDelete && (
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={(e) => handleDelete(c.id, e)}
                          className="text-xs font-medium text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          Delete
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

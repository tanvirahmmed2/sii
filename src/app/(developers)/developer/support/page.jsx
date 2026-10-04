'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiLifeBuoy,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiUser,
  FiArrowRight,
  FiX,
  FiCheck,
  FiMessageSquare,
} from 'react-icons/fi';
import { Context } from 'src/component/helper/Context';

export default function AdminSupportPage() {
  const router = useRouter();
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canDelete = permissions.includes('support') || user?.role === 'admin' || user?.role === 'manager';

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  const fetchTickets = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/support');
      const data = await res.json();
      if (data.success) {
        setTickets(data.records || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error('Error fetching support tickets:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets(true);
  }, [fetchTickets]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!canDelete) {
      notify('Permission denied: support permission required to delete tickets.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this support ticket and all its messages?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/support?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        notify('Support ticket deleted successfully.');
        fetchTickets();
      } else {
        notify(data.error || 'Failed to delete ticket.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Network error deleting ticket.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status?.toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.ticket_number?.toLowerCase().includes(q) ||
      t.requester_name?.toLowerCase().includes(q) ||
      t.creator_name?.toLowerCase().includes(q) ||
      t.requester_email?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  });

  const statusColors = {
    OPEN: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    IN_PROGRESS: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    RESOLVED: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    CLOSED: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    WAITING_FOR_USER: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  };

  const priorityColors = {
    URGENT: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    HIGH: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    MEDIUM: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    LOW: 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
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
              Customer Support Tickets
            </h1>
            <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Helpdesk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Troubleshooting inquiries, platform issues, and live creator support threads.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchTickets(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            title="Refresh tickets"
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
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tickets</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total || tickets.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <FiLifeBuoy className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Open Tickets</span>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.open || 0}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FiClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">In Progress</span>
            <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.in_progress || 0}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FiMessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Resolved</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.resolved || 0}</div>
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
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Tickets'
                  : tab === 'IN_PROGRESS'
                  ? 'In Progress'
                  : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, creator, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</span> of {tickets.length}
            </div>
          </div>
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-normal uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">Ticket #</th>
                <th className="px-4 py-3 whitespace-nowrap">Requester / Creator</th>
                <th className="px-4 py-3">Subject &amp; Last Message</th>
                <th className="px-4 py-3 whitespace-nowrap">Priority</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 whitespace-nowrap">Last Activity</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    Loading support tickets...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    No support tickets match the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/developer/support/${t.id}`)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {t.ticket_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <FiUser className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.creator_name || t.requester_name || 'Creator'}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                        {t.requester_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{t.subject}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                        {t.last_message || 'Initial inquiry open'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md border font-medium text-[10px] uppercase ${priorityColors[t.priority?.toUpperCase()] || priorityColors.MEDIUM}`}>
                        {t.priority || 'medium'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wider ${
                          statusColors[t.status?.toUpperCase()] || statusColors.OPEN
                        }`}
                      >
                        {t.status || 'open'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                      {t.assigned_developer_name ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {t.assigned_developer_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                      {t.last_message_at || t.updated_at ? new Date(t.last_message_at || t.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/developer/support/${t.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px]"
                        >
                          <span>Open</span>
                          <FiArrowRight className="w-3 h-3" />
                        </Link>

                        {canDelete && (
                          <button
                            type="button"
                            disabled={deletingId === t.id}
                            onClick={(e) => handleDelete(t.id, e)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Delete ticket"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading support tickets...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No tickets match criteria.</div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => router.push(`/developer/support/${t.id}`)}
                className="p-4 space-y-2.5 active:bg-slate-50 dark:active:bg-slate-800/50 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {t.ticket_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase ${
                        statusColors[t.status?.toUpperCase()] || statusColors.OPEN
                      }`}
                    >
                      {t.status || 'open'}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase ${
                        priorityColors[t.priority?.toUpperCase()] || priorityColors.MEDIUM
                      }`}
                    >
                      {t.priority || 'medium'}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.subject}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {t.last_message || 'Initial inquiry open'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {t.creator_name || t.requester_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/developer/support/${t.id}`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60"
                    >
                      View Thread →
                    </Link>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === t.id}
                        onClick={(e) => handleDelete(t.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

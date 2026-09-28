'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiSearch,
  BiTrash,
  BiRefresh,
  BiSupport,
  BiCheckCircle,
  BiTimeFive,
  BiX,
  BiUser,
  BiMessageSquareDetail,
  BiCheckShield,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function AdminSupportPage() {
  const router = useRouter();
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canDelete = permissions.includes('support');

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 6000);
  };

  const fetchTickets = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/developer/support');
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
      const res = await fetch(`/api/developer/support/${id}`, {
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
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.ticket_number?.toLowerCase().includes(q) ||
      t.requester_name?.toLowerCase().includes(q) ||
      t.requester_email?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  });

  const statusColors = {
    OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const priorityColors = {
    URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    MEDIUM: 'bg-slate-100 text-slate-700 border-slate-200',
    LOW: 'bg-slate-50 text-slate-500 border-slate-200',
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-base" />
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <BiX className="text-base" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Support Tickets</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Operations
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Troubleshooting inquiries, platform issues, and live creator support threads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchTickets(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <BiRefresh className="text-lg" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Tickets</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total || tickets.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <BiSupport className="text-xl" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600">Open Tickets</span>
            <div className="text-2xl font-bold text-blue-700 mt-1">{stats.open || 0}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BiTimeFive className="text-xl" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600">In Progress</span>
            <div className="text-2xl font-bold text-indigo-700 mt-1">{stats.in_progress || 0}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BiMessageSquareDetail className="text-xl" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600">Resolved</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved || 0}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BiCheckCircle className="text-xl" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
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
              <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Search ticket #, creator, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium shrink-0">
              <span className="font-bold text-slate-800">{filtered.length}</span> of {tickets.length}
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">Ticket #</th>
                <th className="px-4 py-3 whitespace-nowrap">Requester / Creator</th>
                <th className="px-4 py-3 whitespace-nowrap">Subject & Messages</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Priority</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3 whitespace-nowrap">Last Activity</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    Loading support tickets...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    No support tickets match the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/developer/support/${t.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {t.ticket_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <BiUser className="text-slate-400" />
                        <span>{t.creator_name || t.requester_name}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 truncate max-w-[160px]">
                        {t.requester_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{t.subject}</div>
                      <div className="text-slate-500 text-[11px] truncate">
                        {t.last_message || 'Initial inquiry open'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px] uppercase tracking-wider">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] uppercase ${priorityColors[t.priority] || priorityColors.MEDIUM}`}>
                        {t.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          statusColors[t.status] || statusColors.OPEN
                        }`}
                      >
                        {t.status || 'OPEN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                      {t.assigned_developer_name ? (
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <BiCheckShield className="text-sm" />
                          <span>{t.assigned_developer_name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                      {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/developer/support/${t.id}`}
                          className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px]"
                        >
                          Open Thread →
                        </Link>

                        {canDelete && (
                          <button
                            type="button"
                            disabled={deletingId === t.id}
                            onClick={(e) => handleDelete(t.id, e)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete ticket (Admin/Manager)"
                          >
                            <BiTrash className="text-base" />
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
      </div>
    </div>
  );
}

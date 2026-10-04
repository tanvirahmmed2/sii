'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiMessageSquare,
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiArrowRight,
  FiArrowLeft,
  FiInbox,
  FiTag,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi';
import { Context } from 'src/component/helper/Context';

export default function SupportDetailsPage() {
  const router = useRouter();
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canDelete = permissions.includes('support') || user?.role === 'admin' || user?.role === 'manager';

  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  // Fetch all support tickets
  const fetchTickets = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/support');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setTickets(data.records);
        if (data.currentUser) setCurrentUser(data.currentUser);
      }
    } catch (e) {
      console.error('Failed to fetch support tickets details:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets(true);
  }, [fetchTickets]);

  // Background polling every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  // Delete ticket
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this support ticket and thread?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/support/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) => prev.filter((t) => t.id !== id));
      } else {
        alert(data.error || 'Failed to delete ticket.');
      }
    } catch (err) {
      console.error('Delete ticket error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    let matchesStatus = true;
    const st = String(t.status || 'open').toLowerCase();
    if (statusFilter === 'MY_TICKETS') {
      matchesStatus = currentUser && Number(t.assigned_developer_id) === Number(currentUser.id);
    } else if (statusFilter === 'OPEN') {
      matchesStatus = st === 'open';
    } else if (statusFilter === 'IN_PROGRESS') {
      matchesStatus = st === 'in_progress';
    } else if (statusFilter === 'RESOLVED') {
      matchesStatus = st === 'resolved';
    } else if (statusFilter === 'CLOSED') {
      matchesStatus = st === 'closed';
    }

    if (!matchesStatus) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.subject?.toLowerCase().includes(q) ||
      t.creator_name?.toLowerCase().includes(q) ||
      t.requester_name?.toLowerCase().includes(q) ||
      t.creator_email?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  });

  // Calculate metrics
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => String(t.status).toLowerCase() === 'open').length;
  const inProgressCount = tickets.filter((t) => String(t.status).toLowerCase() === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => ['resolved', 'closed'].includes(String(t.status).toLowerCase())).length;
  const myTicketsCount = currentUser ? tickets.filter((t) => Number(t.assigned_developer_id) === Number(currentUser.id)).length : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/developer/support"
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Back to Support Chat"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                Support Hub Workspace
              </h1>
              <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Support Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Troubleshooting inquiries, platform issues, and live creator support threads.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>{currentUser.name} ({currentUser.roleName || 'Developer'})</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchTickets(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer shadow-xs"
            title="Refresh tickets"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Counters (Data Boxes) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-indigo-600 ring-2 ring-indigo-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">All Sessions</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'OPEN'
              ? 'border-blue-600 ring-2 ring-blue-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Awaiting Reply</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{openCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'IN_PROGRESS'
              ? 'border-emerald-600 ring-2 ring-emerald-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Active Chats</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{inProgressCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('MY_TICKETS')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'MY_TICKETS'
              ? 'border-indigo-600 ring-2 ring-indigo-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">My Assigned</div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{myTicketsCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`bg-white dark:bg-slate-900 border rounded-xl p-3.5 sm:p-4 shadow-xs cursor-pointer transition-all col-span-2 sm:col-span-1 ${
            statusFilter === 'RESOLVED'
              ? 'border-amber-600 ring-2 ring-amber-600/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Closed / Resolved</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{resolvedCount}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search visitor, developer, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'MY_TICKETS', label: 'My Chats' },
            { id: 'OPEN', label: 'Open' },
            { id: 'IN_PROGRESS', label: 'Active' },
            { id: 'RESOLVED', label: 'Resolved' },
            { id: 'CLOSED', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading && tickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <FiRefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span className="text-xs font-normal">Loading support tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <FiInbox className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-1" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No support tickets found</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter criteria.'
                : 'No creators have opened a support ticket yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTickets.map((ticket) => {
              const status = String(ticket.status || 'open').toUpperCase();
              return (
                <div
                  key={ticket.id}
                  onClick={() => router.push(`/developer/support/${ticket.id}`)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm sm:text-base shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {ticket.requester_name?.charAt(0)?.toUpperCase() || ticket.creator_name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {ticket.subject || 'Support Ticket'}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          #{ticket.id}
                        </span>

                        <span
                          className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                            status === 'RESOLVED'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : status === 'IN_PROGRESS'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {status}
                        </span>

                        {ticket.category && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            <FiTag className="w-3 h-3" />
                            <span>{ticket.category}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate mb-1">
                        <span className="font-medium text-slate-500">From: </span>
                        {ticket.requester_name || ticket.creator_name || 'Creator'} ({ticket.creator_email || 'No email'})
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</span>
                        </span>
                        {ticket.reply_count !== undefined && (
                          <span>&bull; {ticket.reply_count} {Number(ticket.reply_count) === 1 ? 'reply' : 'replies'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Link
                      href={`/developer/support/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors"
                    >
                      <span>Join Chat</span>
                      <FiArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === ticket.id}
                        onClick={(e) => handleDelete(ticket.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Delete ticket"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

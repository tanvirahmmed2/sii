'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div className="flex items-center gap-3">
          <Link
            href="/developer/support"
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Back
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Support Hub Workspace
              </h1>
              <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Support Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Troubleshooting inquiries, platform issues, and live creator support threads.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <span>{currentUser.name} ({currentUser.roleName || 'Developer'})</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchTickets(true)}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-slate-900 dark:border-slate-100'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">All Sessions</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'OPEN'
              ? 'border-blue-600'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 mb-1">Awaiting Reply</div>
          <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{openCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'IN_PROGRESS'
              ? 'border-emerald-600'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Active Chats</div>
          <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{inProgressCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('MY_TICKETS')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'MY_TICKETS'
              ? 'border-slate-900 dark:border-slate-100'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">My Assigned</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{myTicketsCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all col-span-2 sm:col-span-1 ${
            statusFilter === 'RESOLVED'
              ? 'border-amber-600'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 mb-1">Closed / Resolved</div>
          <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">{resolvedCount}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Search visitor, developer, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
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
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
        {loading && tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-xs font-normal">Loading support tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No support tickets found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-semibold text-sm shrink-0">
                      {ticket.requester_name?.charAt(0)?.toUpperCase() || ticket.creator_name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline">
                          {ticket.subject || 'Support Ticket'}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          #{ticket.id}
                        </span>

                        <span
                          className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded border ${
                            status === 'RESOLVED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                              : status === 'IN_PROGRESS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {status}
                        </span>

                        {ticket.category && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {ticket.category}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate mb-1">
                        <span className="font-medium text-slate-500">From: </span>
                        {ticket.requester_name || ticket.creator_name || 'Creator'} ({ticket.creator_email || 'No email'})
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</span>
                        {ticket.reply_count !== undefined && (
                          <span>• {ticket.reply_count} {Number(ticket.reply_count) === 1 ? 'reply' : 'replies'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Link
                      href={`/developer/support/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                    >
                      Join Chat
                    </Link>

                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingId === ticket.id}
                        onClick={(e) => handleDelete(ticket.id, e)}
                        className="px-2 py-1 rounded border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Delete
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

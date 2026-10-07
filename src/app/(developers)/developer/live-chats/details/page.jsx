'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function LiveChatDetailsPage() {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  // Fetch all chat sessions
  const fetchChats = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/live_chats');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setChats(data.records);
        if (data.currentUser) setCurrentUser(data.currentUser);
      }
    } catch (e) {
      console.error('Failed to fetch live chats details:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/marketing/developer/live_chats')
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.records)) {
          setChats(data.records);
          if (data.currentUser) setCurrentUser(data.currentUser);
        }
      })
      .catch((e) => console.error('Failed to fetch live chats:', e))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Background polling every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChats(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Delete chat session
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this live chat session? All message history will be removed.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/live_chats?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setChats((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(data.error || 'Failed to delete chat.');
      }
    } catch (err) {
      console.error('Delete chat error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter chats by search term and status
  const filteredChats = chats.filter((chat) => {
    let matchesStatus = true;
    if (statusFilter === 'MY_CHATS') {
      matchesStatus = currentUser && Number(chat.assigned_developer_id) === Number(currentUser.id);
    } else if (statusFilter === 'UNASSIGNED') {
      matchesStatus = !chat.assigned_developer_id;
    } else if (statusFilter !== 'ALL') {
      matchesStatus = String(chat.status).toUpperCase() === statusFilter;
    }

    if (!matchesStatus) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      chat.visitor_name?.toLowerCase().includes(q) ||
      chat.visitor_email?.toLowerCase().includes(q) ||
      chat.last_message?.toLowerCase().includes(q) ||
      chat.assigned_developer_name?.toLowerCase().includes(q) ||
      String(chat.id).includes(q)
    );
  });

  // Calculate metrics
  const totalCount = chats.length;
  const openCount = chats.filter((c) => String(c.status).toUpperCase() === 'OPEN').length;
  const activeCount = chats.filter((c) => String(c.status).toUpperCase() === 'ACTIVE').length;
  const resolvedCount = chats.filter((c) => ['RESOLVED', 'CLOSED'].includes(String(c.status).toUpperCase())).length;
  const myChatsCount = currentUser ? chats.filter((c) => Number(c.assigned_developer_id) === Number(currentUser.id)).length : 0;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div className="flex items-center gap-3">
          <Link
            href="/developer/live-chats"
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Back
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Live Chat Workspace
              </h1>
              <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Support Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time visitor live chats, 24-hour persistent guest sessions, and developer support stream.
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
            onClick={() => fetchChats(true)}
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
          onClick={() => setStatusFilter('ACTIVE')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'ACTIVE'
              ? 'border-emerald-600'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Active Chats</div>
          <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('MY_CHATS')}
          className={`bg-white dark:bg-slate-900 border rounded p-3.5 cursor-pointer transition-all ${
            statusFilter === 'MY_CHATS'
              ? 'border-slate-900 dark:border-slate-100'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">My Assigned</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{myChatsCount}</div>
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
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Search visitor, developer, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'MY_CHATS', label: 'My Chats' },
            { id: 'OPEN', label: 'Open' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'UNASSIGNED', label: 'Unassigned' },
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

      {/* Chat Sessions List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
        {loading && chats.length === 0 ? (
          <LoadingScreen fullScreen={false} label="Loading live chat conversations..." />
        ) : filteredChats.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No conversations found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter criteria.'
                : 'No visitors have initiated a live chat session yet.'}
            </p>
            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredChats.map((chat) => {
              const status = String(chat.status || 'OPEN').toUpperCase();
              return (
                <div
                  key={chat.id}
                  onClick={() => router.push(`/developer/live-chats/${chat.id}`)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-sm shrink-0">
                      {chat.visitor_name?.charAt(0)?.toUpperCase() || 'V'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline">
                          {chat.visitor_name}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          #{chat.id}
                        </span>

                        <span
                          className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded border ${
                            status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : status === 'OPEN'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                              : status === 'RESOLVED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {status}
                        </span>

                        {chat.assigned_developer_name ? (
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            Assigned: {chat.assigned_developer_name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            Unassigned
                          </span>
                        )}

                        {chat.unread_count > 0 && (
                          <span className="text-[9px] font-medium uppercase text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            {chat.unread_count} new {chat.unread_count === 1 ? 'msg' : 'msgs'}
                          </span>
                        )}

                        {chat.message_count > 0 && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {chat.message_count} total
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate mb-1">
                        {chat.last_message ? (
                          <>
                            <span className="font-medium text-slate-500">
                              {chat.last_sender_type === 'ADMIN' ? 'Support: ' : 'Visitor: '}
                            </span>
                            {chat.last_message}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No messages yet</span>
                        )}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span>{chat.visitor_email || 'Guest visitor'}</span>
                        {chat.ip_address && (
                          <span>• IP: {chat.ip_address}</span>
                        )}
                        <span>
                          •{' '}
                          {chat.last_message_at
                            ? `Last msg: ${new Date(chat.last_message_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : `Created: ${new Date(chat.created_at).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Link
                      href={`/developer/live-chats/${chat.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                    >
                      Join Chat
                    </Link>

                    <button
                      type="button"
                      disabled={deletingId === chat.id}
                      onClick={(e) => handleDelete(chat.id, e)}
                      className="px-2 py-1 rounded border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
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

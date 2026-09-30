'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiSearch,
  BiRefresh,
  BiTrash,
  BiSupport,
  BiUser,
  BiCheckCircle,
  BiTimeFive,
  BiLoaderAlt,
  BiChevronRight,
  BiMessageRoundedDots,
  BiEnvelope,
  BiMessageSquareDetail,
  BiUserCheck,
} from 'react-icons/bi';

export default function AdminLiveChatsPage() {
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
      const res = await fetch('/api/developer/live_chats');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setChats(data.records);
        if (data.currentUser) setCurrentUser(data.currentUser);
      }
    } catch (e) {
      console.error('Failed to fetch live chats:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/developer/live_chats')
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

  // Background silent polling every 4s for new chats and updates without flashing loading state
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
      const res = await fetch(`/api/developer/live_chats?id=${id}`, {
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
      chat.session_id?.toLowerCase().includes(q) ||
      chat.assigned_developer_name?.toLowerCase().includes(q) ||
      chat.last_message?.toLowerCase().includes(q)
    );
  });

  // Calculate metrics
  const totalCount = chats.length;
  const openCount = chats.filter((c) => String(c.status).toUpperCase() === 'OPEN').length;
  const activeCount = chats.filter((c) => String(c.status).toUpperCase() === 'ACTIVE').length;
  const resolvedCount = chats.filter((c) => ['RESOLVED', 'CLOSED'].includes(String(c.status).toUpperCase())).length;
  const myChatsCount = currentUser ? chats.filter((c) => Number(c.assigned_developer_id) === Number(currentUser.id)).length : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Chat Workspace</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Support Hub
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time visitor live chats, 24-hour persistent guest sessions, and developer support stream.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentUser.name} ({currentUser.roleName || 'Developer'})</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchChats(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Refresh conversations"
          >
            <BiRefresh className="text-base" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500 mb-1">All Sessions</div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'OPEN' ? 'border-blue-600 ring-2 ring-blue-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-blue-600 mb-1">Awaiting Reply</div>
          <div className="text-2xl font-black text-blue-700">{openCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('ACTIVE')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ACTIVE' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-600 mb-1">Active Chats</div>
          <div className="text-2xl font-black text-emerald-700">{activeCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('MY_CHATS')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            statusFilter === 'MY_CHATS' ? 'border-indigo-600 ring-2 ring-indigo-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-indigo-600 mb-1">My Assigned</div>
          <div className="text-2xl font-black text-indigo-700">{myChatsCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`bg-white border rounded-2xl p-4 shadow-xs cursor-pointer transition-all col-span-2 sm:col-span-1 ${
            statusFilter === 'RESOLVED' ? 'border-amber-600 ring-2 ring-amber-600/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-amber-600 mb-1">Closed / Resolved</div>
          <div className="text-2xl font-black text-amber-700">{resolvedCount}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
          <input
            type="text"
            placeholder="Search visitor, developer, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Sessions List */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        {loading && chats.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <BiLoaderAlt className="animate-spin text-3xl text-slate-700" />
            <span className="text-xs font-semibold">Loading live chat conversations...</span>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <BiMessageSquareDetail className="text-4xl text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No conversations found</p>
            <p className="text-xs text-slate-400 max-w-sm">
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
                className="mt-2 text-xs font-bold text-slate-800 underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredChats.map((chat) => {
              const status = String(chat.status || 'OPEN').toUpperCase();
              return (
                <div
                  key={chat.id}
                  onClick={() => router.push(`/developer/live-chats/${chat.id}`)}
                  className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Visitor Info & Message Snippet */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-base shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      {chat.visitor_name?.charAt(0)?.toUpperCase() || 'V'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {chat.visitor_name}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{chat.id}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : status === 'OPEN'
                              ? 'bg-blue-100 text-blue-700'
                              : status === 'RESOLVED'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {status}
                        </span>

                        {/* Assigned Developer Badge */}
                        {chat.assigned_developer_name ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            <BiUserCheck className="text-xs" />
                            <span>{chat.assigned_developer_name}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Unassigned
                          </span>
                        )}

                        {/* Unread Visitor Message Badge */}
                        {chat.unread_count > 0 && (
                          <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                            {chat.unread_count} new {chat.unread_count === 1 ? 'msg' : 'msgs'}
                          </span>
                        )}

                        {chat.message_count > 0 && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {chat.message_count} total
                          </span>
                        )}
                      </div>

                      {/* Last message snippet */}
                      <p className="text-xs text-slate-600 truncate mb-1">
                        {chat.last_message ? (
                          <>
                            <span className="font-semibold text-slate-500">
                              {chat.last_sender_type === 'ADMIN' ? 'Support: ' : 'Visitor: '}
                            </span>
                            {chat.last_message}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No messages yet</span>
                        )}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <BiEnvelope className="text-xs" />
                          <span>{chat.visitor_email || 'Guest visitor'}</span>
                        </span>
                        {chat.ip_address && (
                          <span>• IP: {chat.ip_address}</span>
                        )}
                        <span>
                          •{' '}
                          {chat.last_message_at
                            ? `Last message: ${new Date(chat.last_message_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : `Created: ${new Date(chat.created_at).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Link
                      href={`/developer/live-chats/${chat.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <span>Join Chat</span>
                      <BiChevronRight className="text-base group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <button
                      type="button"
                      disabled={deletingId === chat.id}
                      onClick={(e) => handleDelete(chat.id, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete conversation"
                    >
                      {deletingId === chat.id ? (
                        <BiLoaderAlt className="animate-spin text-base" />
                      ) : (
                        <BiTrash className="text-base" />
                      )}
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

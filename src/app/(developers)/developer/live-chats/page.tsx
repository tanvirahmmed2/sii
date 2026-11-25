'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ChatUsersSwipeBar from 'src/component/marketing/developer/ChatUsersSwipeBar';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function AdminLiveChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryChatId = searchParams.get('chatId');

  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<any>(null);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: string }>({ text: '', type: '' });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const messagesEndRef = useRef<any>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const notify = (text: string, type: string = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 4000);
  };

  const fetchChats = useCallback(
    async (showLoading: boolean = false) => {
      try {
        if (showLoading) setLoading(true);
        const res = await fetch('/api/marketing/developer/live_chats');
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setChats(data.records);
          if (data.currentUser) setCurrentUser(data.currentUser);
          if (data.records.length > 0) {
            const sorted = [...data.records].sort((a: any, b: any) => {
              const timeA = a.last_message_at || a.updated_at || a.created_at;
              const timeB = b.last_message_at || b.updated_at || b.created_at;
              return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
            setActiveChatId((prev: any) => {
              if (prev && data.records.some((c: any) => String(c.id) === String(prev))) {
                return prev;
              }
              return queryChatId || sorted[0].id;
            });
          } else {
            setActiveChatId(null);
            setActiveChat(null);
            setMessages([]);
          }
        }
      } catch (e: any) {
        console.error('Failed to fetch live chats:', e);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [queryChatId]
  );

  useEffect(() => {
    fetchChats(true);
  }, [fetchChats]);

  const fetchActiveChatDetails = useCallback(async (chatId: any, showLoading: boolean = false) => {
    if (!chatId) return;
    try {
      if (showLoading) setLoadingMessages(true);
      const res = await fetch(`/api/marketing/developer/live_chats?chatId=${chatId}`);
      const data = await res.json();
      if (data.success && data.chat) {
        setActiveChat(data.chat);
        setMessages(data.messages || []);
        if (data.currentUser) setCurrentUser(data.currentUser);
      }
    } catch (err: any) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeChatId) {
      fetchActiveChatDetails(activeChatId, true);
    }
  }, [activeChatId, fetchActiveChatDetails]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchChats(false);
      if (activeChatId) {
        fetchActiveChatDetails(activeChatId, false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeChatId, fetchChats, fetchActiveChatDetails]);

  const handleSendReply = async (e: any) => {
    if (e) e.preventDefault();
    const text = replyMessage.trim();
    if (!text || !activeChatId || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        if (data.messageRecord) {
          setMessages((prev: any) => [...prev, data.messageRecord]);
        }
        await fetchChats(false);
      } else {
        notify(data.error || 'Failed to send reply', 'error');
      }
    } catch (err: any) {
      console.error('Error sending reply:', err);
      notify('Network error sending message', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleStatus = async (newStatus: string) => {
    if (!activeChatId) return;
    try {
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify(`Chat status updated to ${newStatus}`);
        await fetchChats(false);
        await fetchActiveChatDetails(activeChatId, false);
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
    }
  };

  const filteredChats = useMemo(() => {
    return chats.filter((c: any) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        String(c.id || '').includes(term) ||
        String(c.visitor_name || '').toLowerCase().includes(term) ||
        String(c.visitor_email || '').toLowerCase().includes(term) ||
        String(c.last_message || '').toLowerCase().includes(term);

      const status = String(c.status || 'OPEN').toUpperCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'OPEN' && status === 'OPEN') ||
        (statusFilter === 'ACTIVE' && status === 'ACTIVE') ||
        (statusFilter === 'RESOLVED' && (status === 'RESOLVED' || status === 'CLOSED'));

      return matchesSearch && matchesStatus;
    });
  }, [chats, searchTerm, statusFilter]);

  useEffect(() => {
    if (filteredChats.length > 0) {
      const exists = filteredChats.some((c: any) => String(c.id) === String(activeChatId));
      if (!exists) {
        setActiveChatId(filteredChats[0].id);
      }
    }
  }, [filteredChats, activeChatId]);

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Visitor Live Chats
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Support &amp; Comms
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time chat messaging with website visitors, prospects, and prospective institutional clients.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="w-full sm:w-56">
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              Search Live Chats
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="ACTIVE">Active Only</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => fetchChats(true)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Refresh
            </button>
            <Link
              href="/developer/live-chats/details"
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
            >
              Table View
            </Link>
          </div>
        </div>
      </div>

      {actionNotice.text && (
        <div
          className={`p-3 rounded text-xs font-medium border ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          {actionNotice.text}
        </div>
      )}

      <ChatUsersSwipeBar
        users={filteredChats.map((c: any) => ({
          id: c.id,
          name: c.visitor_name || 'Visitor',
          avatar: null,
          lastMessageAt: c.last_message_at || c.updated_at || c.created_at,
          unreadCount: c.unread_count || 0,
          active: String(c.id) === String(activeChatId),
          onClick: () => setActiveChatId(c.id),
        }))}
        activeId={activeChatId}
      />

      {loading && chats.length === 0 ? (
        <LoadingScreen fullScreen={false} label="Loading live chats..." />
      ) : filteredChats.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No live chats found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No chat sessions match your search keyword or status filter criteria.'
              : 'There are currently no active visitor chat sessions.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : activeChat ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden flex flex-col h-[650px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
                {activeChat.visitor_name?.charAt(0)?.toUpperCase() || 'V'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {activeChat.visitor_name}
                  </h2>
                  <span
                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                      String(activeChat.status).toUpperCase() === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : String(activeChat.status).toUpperCase() === 'OPEN'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {activeChat.status || 'OPEN'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeChat.visitor_email || 'Guest visitor'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {String(activeChat.status).toUpperCase() !== 'RESOLVED' ? (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('RESOLVED')}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  Resolve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('ACTIVE')}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  Re-open
                </button>
              )}

              <Link
                href="/developer/live-chats/details"
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                Details
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
            {loadingMessages && messages.length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <LoadingScreen fullScreen={false} size="sm" label="Loading conversation thread..." />
              </div>
            ) : (
              messages.map((m: any) => {
                const isStaff =
                  m.sender_type === 'DEVELOPER' ||
                  m.sender_type === 'STAFF' ||
                  m.sender_type === 'ADMIN';
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isStaff ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isStaff && (
                      <div className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-[10px] shrink-0 mb-1">
                        {(m.sender_name || 'V').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] sm:max-w-md rounded p-3 text-xs leading-relaxed ${
                        isStaff
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                        <span className="font-semibold">
                          {m.sender_name || (isStaff ? 'Support Staff' : 'Visitor')}
                        </span>
                        <span>•</span>
                        <span>
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendReply}
            className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={replyMessage}
              onChange={(e: any) => setReplyMessage(e.target.value)}
              disabled={sendingReply}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            />
            <button
              type="submit"
              disabled={!replyMessage.trim() || sendingReply}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

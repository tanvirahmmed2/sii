'use client';
import { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import ChatUsersSwipeBar from '../ChatUsersSwipeBar';
import { useSocketRooms } from 'src/lib/realtime/useSocket';

export default function MetaMessenger({
  platform = 'facebook',
  title = 'Facebook Messenger',
  subtitle = 'Manage Facebook Page customer conversations and direct replies via Meta Graph API',
}: any) {
  const searchParams = useSearchParams();
  const queryConvId = searchParams.get('convId') || searchParams.get('id');

  const { user } = useContext<any>(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner =
    Number(user?.id) === 1 ||
    String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' ||
    permissions.includes('*');

  const hasPlatformPerm =
    isOwner ||
    permissions.includes(`${platform}-messages`) ||
    permissions.includes(`${platform}_messages`) ||
    permissions.includes(platform) ||
    permissions.includes('meta') ||
    permissions.includes('chats');

  const canManage = Boolean(isOwner || hasPlatformPerm || permissions.includes('support'));
  const canDelete = Boolean(isOwner || hasPlatformPerm);

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loadingConvs, setLoadingConvs] = useState<boolean>(true);
  const [loadingMsgs, setLoadingMsgs] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [apiNotice, setApiNotice] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const messagesEndRef = useRef<any>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = useCallback(
    async (silent: boolean = false) => {
      try {
        const url = `/api/marketing/developer/meta/conversations?platform=${platform}&status=ALL`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setConversations(data.records);
          if (data.records.length > 0) {
            const sorted = [...data.records].sort((a: any, b: any) => {
              const timeA = a.last_message_at || a.updated_at || a.created_at;
              const timeB = b.last_message_at || b.updated_at || b.created_at;
              return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
            setSelectedConv((prev: any) => {
              if (queryConvId) {
                const matched = data.records.find((c: any) => String(c.id) === String(queryConvId));
                if (matched) return matched;
              }
              if (prev) {
                const stillExists = data.records.find((c: any) => c.id === prev.id);
                if (stillExists) return stillExists;
              }
              return sorted[0] || null;
            });
          } else {
            setSelectedConv(null);
            setMessages([]);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        if (!silent) setLoadingConvs(false);
      }
    },
    [platform, queryConvId]
  );

  const fetchMessages = useCallback(async (convId: any, silent: boolean = false) => {
    if (!convId) return;
    try {
      if (!silent) setLoadingMsgs(true);
      const res = await fetch(`/api/marketing/developer/meta/messages?conversationId=${convId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setMessages(data.records);
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConv?.id) {
      fetchMessages(selectedConv.id);
    }
  }, [selectedConv?.id, fetchMessages]);

  const { connected: socketConnected } = useSocketRooms(
    [`meta:${platform}`, selectedConv?.id ? `meta:conv:${selectedConv.id}` : null],
    {
      'meta:message': (payload: any) => {
        if (payload?.platform !== platform) return;
        if (payload?.record && String(payload.conversationId) === String(selectedConv?.id)) {
          setMessages((prev: any[]) =>
            prev.some((m: any) => String(m.id) === String(payload.record.id))
              ? prev
              : [...prev, payload.record]
          );
        }
        fetchConversations(true);
      },
      'meta:conversation_updated': (payload: any) => {
        if (payload?.platform !== platform) return;
        if (payload?.record && String(payload.conversationId) === String(selectedConv?.id)) {
          setSelectedConv((prev: any) => (prev ? { ...prev, ...payload.record } : prev));
        }
        fetchConversations(true);
      },
      'meta:conversation_deleted': (payload: any) => {
        if (payload?.platform !== platform) return;
        if (String(payload.conversationId) === String(selectedConv?.id)) {
          setSelectedConv(null);
          setMessages([]);
        }
        fetchConversations(true);
      },
    }
  );

  useEffect(() => {
    if (socketConnected) return;
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConv?.id) {
        fetchMessages(selectedConv.id, true);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [socketConnected, selectedConv?.id, fetchConversations, fetchMessages]);

  const handleSendMessage = async (e: any) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedConv?.id || sending) return;
    setSending(true);
    setApiNotice(null);
    try {
      const res = await fetch('/api/marketing/developer/meta/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          message: text,
          messageText: text,
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setInputText('');
        setMessages((prev: any) =>
          prev.some((m: any) => String(m.id) === String(data.record.id)) ? prev : [...prev, data.record]
        );
        if (data.apiNotice || data.warning) {
          setApiNotice(data.apiNotice || data.warning);
        }
        fetchConversations(true);
      } else {
        console.warn(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedConv?.id || statusUpdating) return;
    const newStatus = selectedConv.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    setStatusUpdating(true);
    try {
      const res = await fetch('/api/marketing/developer/meta/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedConv.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setSelectedConv(data.record);
        setConversations((prev: any) =>
          prev.map((c: any) => (c.id === data.record.id ? data.record : c))
        );
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/marketing/developer/meta/conversations?id=${deleteConfirmModal.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        const remaining = conversations.filter((c: any) => c.id !== deleteConfirmModal.id);
        setConversations(remaining);
        if (selectedConv?.id === deleteConfirmModal.id) {
          setSelectedConv(remaining[0] || null);
        }
        setDeleteConfirmModal(null);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c: any) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        String(c.id || '').includes(term) ||
        String(c.recipient_name || '').toLowerCase().includes(term) ||
        String(c.recipient_phone || '').toLowerCase().includes(term) ||
        String(c.recipient_id || '').toLowerCase().includes(term) ||
        String(c.last_message || '').toLowerCase().includes(term);

      const status = String(c.status || 'OPEN').toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [conversations, searchTerm, statusFilter]);

  useEffect(() => {
    if (filteredConversations.length > 0) {
      const exists = filteredConversations.some((c: any) => String(c.id) === String(selectedConv?.id));
      if (!exists) {
        setSelectedConv(filteredConversations[0]);
      }
    }
  }, [filteredConversations, selectedConv?.id]);

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Your account role (<span className="font-medium capitalize">{user?.role || 'developer'}</span>) does not have permission to manage {title}.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 uppercase">
              Meta Graph API
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                socketConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {socketConnected ? 'Live' : 'Syncing'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="w-full sm:w-56">
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              Search Conversations
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
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open Only</option>
              <option value="RESOLVED">Resolved Only</option>
              <option value="SPAM">Spam</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => fetchConversations(false)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Refresh
            </button>
            <Link
              href={`/developer/${platform}-messages/details`}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
            >
              Table View
            </Link>
          </div>
        </div>
      </div>

      <ChatUsersSwipeBar
        users={filteredConversations.map((c: any) => ({
          id: c.id,
          name: c.recipient_name || (platform === 'whatsapp' ? c.recipient_phone : null) || 'Customer',
          avatar: c.recipient_avatar,
          lastMessageAt: c.last_message_at || c.updated_at || c.created_at,
          unreadCount: c.unread_count || 0,
          active: selectedConv?.id === c.id,
          onClick: () => setSelectedConv(c),
        }))}
        activeId={selectedConv?.id}
      />

      {loadingConvs && conversations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 flex items-center justify-center">
          <div className="loader loader-md" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No conversations found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No conversations match your search keyword or status filter.'
              : `There are currently no active ${title} customer conversations.`}
          </p>
          {(searchTerm || statusFilter !== 'ALL') ? (
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
          ) : (
            <Link
              href={`/developer/${platform}-messages/details`}
              className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Workspace Details
            </Link>
          )}
        </div>
      ) : selectedConv ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden flex flex-col h-[650px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
                {(selectedConv.recipient_name?.[0] || 'C').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedConv.recipient_name || 'Customer'}
                  </h2>
                  <span
                    className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded border ${
                      selectedConv.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {selectedConv.status || 'OPEN'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                  <span>ID: {selectedConv.recipient_id}</span>
                  {selectedConv.recipient_phone && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{selectedConv.recipient_phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={statusUpdating}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                  selectedConv.status === 'OPEN'
                    ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : 'text-slate-700 border-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                {selectedConv.status === 'OPEN' ? 'Resolve' : 'Re-open'}
              </button>

              <Link
                href={`/developer/${platform}-messages/details`}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                Details
              </Link>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal(selectedConv)}
                  className="px-2 py-1 text-xs font-medium rounded border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {apiNotice && (
            <div className="mx-4 mt-2.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
              <span>{apiNotice}</span>
              <button
                type="button"
                onClick={() => setApiNotice(null)}
                className="text-amber-700 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
            {loadingMsgs && messages.length === 0 ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="loader loader-sm" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <p>No messages in this conversation yet.</p>
              </div>
            ) : (
              messages.map((m: any) => {
                const isOutbound = ['STAFF', 'SYSTEM', 'staff', 'system', 'page'].includes(m.sender_type);
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOutbound && (
                      <div className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-[10px] shrink-0 mb-1">
                        {(m.sender_name?.[0] || 'C').toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] sm:max-w-md rounded p-3 text-xs leading-relaxed ${
                        isOutbound
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                        <span>
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                        {isOutbound && (
                          <span className="text-[9px] uppercase font-mono">
                            {m.delivery_status || m.status || 'SENT'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              aria-label={`Reply to ${selectedConv.recipient_name || 'customer'}`}
              value={inputText}
              onChange={(e: any) => setInputText(e.target.value)}
              disabled={sending}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      ) : null}

      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Delete Conversation
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete the conversation thread with{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {deleteConfirmModal.recipient_name || 'this customer'}
              </span>
              ? All local message history for this thread will be permanently erased.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Thread'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

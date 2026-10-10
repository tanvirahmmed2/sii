'use client';

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import ChatUsersSwipeBar from '../ChatUsersSwipeBar';

export default function MetaMessenger({
  platform = 'facebook',
  title = 'Facebook Messenger',
  subtitle = 'Manage Facebook Page customer conversations and direct replies via Meta Graph API',
}) {
  const searchParams = useSearchParams();
  const queryConvId = searchParams.get('convId') || searchParams.get('id');

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner = Number(user?.id) === 1;
  const hasPlatformPerm = isOwner || permissions.includes(`${platform}-messages`) || permissions.includes('chats');
  const canManage = Boolean(isOwner || hasPlatformPerm || permissions.includes('support'));
  const canDelete = Boolean(isOwner || hasPlatformPerm);

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [apiNotice, setApiNotice] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Fetch conversations
  const fetchConversations = useCallback(
    async (silent = false) => {
      try {
        const url = `/api/marketing/developer/meta/conversations?platform=${platform}&status=ALL`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setConversations(data.records);

          // Sort latest sender first to pick active chat
          if (data.records.length > 0) {
            const sorted = [...data.records].sort((a, b) => {
              const timeA = a.last_message_at || a.updated_at || a.created_at;
              const timeB = b.last_message_at || b.updated_at || b.created_at;
              return new Date(timeB) - new Date(timeA);
            });
            setSelectedConv((prev) => {
              if (queryConvId) {
                const matched = data.records.find((c) => String(c.id) === String(queryConvId));
                if (matched) return matched;
              }
              if (prev) {
                const stillExists = data.records.find((c) => c.id === prev.id);
                if (stillExists) return stillExists;
              }
              return sorted[0] || null;
            });
          } else {
            setSelectedConv(null);
            setMessages([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        if (!silent) setLoadingConvs(false);
      }
    },
    [platform, queryConvId]
  );

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId, silent = false) => {
    if (!convId) return;
    try {
      if (!silent) setLoadingMsgs(true);
      const res = await fetch(`/api/marketing/developer/meta/messages?conversationId=${convId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setMessages(data.records);
      }
    } catch (err) {
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

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConv?.id) {
        fetchMessages(selectedConv.id, true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedConv?.id, fetchConversations, fetchMessages]);

  // Send message
  const handleSendMessage = async (e) => {
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
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setInputText('');
        setMessages((prev) => [...prev, data.record]);
        if (data.apiNotice) setApiNotice(data.apiNotice);
        fetchConversations(true);
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  // Toggle status
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
        setConversations((prev) => prev.map((c) => (c.id === data.record.id ? data.record : c)));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async () => {
    if (!selectedConv?.id) return;
    if (!confirm('Are you sure you want to delete this conversation and all associated message history?')) return;
    try {
      const res = await fetch(`/api/marketing/developer/meta/conversations?id=${selectedConv.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        const remaining = conversations.filter((c) => c.id !== selectedConv.id);
        setConversations(remaining);
        setSelectedConv(remaining[0] || null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Your account role (<span className="font-medium capitalize">{role}</span>) does not have permission to manage {title}.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Top Touch-Swipeable Users Bar */}
      <ChatUsersSwipeBar
        users={conversations.map((c) => ({
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

      {/* Main Content Area */}
      {loadingConvs && conversations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center text-slate-400">
          <span className="text-xs font-normal">Loading {title} conversations...</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No chats are available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            There are currently no active {title} customer conversations.
          </p>
          <Link
            href={`/developer/${platform}-messages/details`}
            className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Workspace Details
          </Link>
        </div>
      ) : selectedConv ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden flex flex-col h-[650px]">
          {/* Header */}
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
                      <span className="font-mono">
                        {selectedConv.recipient_phone}
                      </span>
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
                  onClick={handleDeleteConversation}
                  className="px-2 py-1 text-xs font-medium rounded border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* API notice */}
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

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
            {loadingMsgs && messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <p>No messages in this conversation yet.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isOutbound = m.sender_type === 'page';
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
                            {m.status === 'read' ? 'Read' : 'Sent'}
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

          {/* Message Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Reply to ${selectedConv.recipient_name || 'customer'}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={sending}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
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

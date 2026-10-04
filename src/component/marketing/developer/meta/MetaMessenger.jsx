'use client';

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import ChatUsersSwipeBar from '../ChatUsersSwipeBar';
import {
  BiSend,
  BiCheck,
  BiCheckDouble,
  BiTrash,
  BiInfoCircle,
  BiPhone,
  BiShieldQuarter,
} from 'react-icons/bi';
import { FiRefreshCw, FiArrowRight, FiMessageSquare } from 'react-icons/fi';

export default function MetaMessenger({
  platform = 'facebook',
  title = 'Facebook Messenger',
  subtitle = 'Manage Facebook Page customer conversations and direct replies via Meta Graph API',
  IconComponent,
  brandColor = 'text-blue-600 dark:text-blue-400',
  brandBg = 'bg-blue-600',
  brandBadge = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
}) {
  const searchParams = useSearchParams();
  const queryConvId = searchParams.get('convId') || searchParams.get('id');

  const { user } = useContext(Context);
  const role = (user?.role || 'developer').toLowerCase();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminOrManager = ['admin', 'superadmin', 'manager'].includes(role);
  const hasPlatformPerm = isAdminOrManager || permissions.includes(`${platform}-messages`) || permissions.includes('chats');
  const canManage = Boolean(isAdminOrManager || hasPlatformPerm || permissions.includes('support') || role === 'support');
  const canDelete = Boolean(isAdminOrManager || hasPlatformPerm);

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

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConv?.id) {
      fetchMessages(selectedConv.id);
    }
  }, [selectedConv?.id, fetchMessages]);

  // Background polling every 4 seconds
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl">
          <BiShieldQuarter />
        </div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Your account role (<span className="font-medium capitalize">{role}</span>) does not have permission to manage {title}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-6xl mx-auto">
      {/* Top Touch-Swipeable Users Bar (icon and name only, latest on left) */}
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

      {/* Main Content Area: No extra bar or data box */}
      {loadingConvs && conversations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center text-slate-400 shadow-xs flex flex-col items-center justify-center gap-2">
          <FiRefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          <span className="text-xs font-normal">Loading {title} conversations...</span>
        </div>
      ) : conversations.length === 0 ? (
        /* Empty State: No chats are available */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            {IconComponent ? <IconComponent className="text-2xl" /> : <FiMessageSquare className="w-6 h-6" />}
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No chats are available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            There are currently no active {title} customer conversations.
          </p>
          <Link
            href={`/developer/${platform}-messages/details`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            <span>Workspace Details</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : selectedConv ? (
        /* Active Chat Workspace: Simple and Minimal without extra bars or data boxes */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col h-[650px]">
          {/* Minimal Chat Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                {(selectedConv.recipient_name?.[0] || 'C').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedConv.recipient_name || 'Customer'}
                  </h2>
                  <span
                    className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded ${
                      selectedConv.status === 'OPEN'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {selectedConv.status || 'OPEN'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                  <span>ID: {selectedConv.recipient_id}</span>
                  {selectedConv.recipient_phone && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 font-mono">
                        <BiPhone className="text-xs" />
                        {selectedConv.recipient_phone}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Quick status toggle */}
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={statusUpdating}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                  selectedConv.status === 'OPEN'
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                }`}
              >
                {selectedConv.status === 'OPEN' ? 'Resolve' : 'Re-open'}
              </button>

              {/* Link to /details */}
              <Link
                href={`/developer/${platform}-messages/details`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors"
                title="View full workspace details and metrics"
              >
                <span>Details</span>
                <FiArrowRight className="w-3 h-3" />
              </Link>

              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteConversation}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                  title="Delete conversation"
                >
                  <BiTrash className="text-base" />
                </button>
              )}
            </div>
          </div>

          {/* API notice */}
          {apiNotice && (
            <div className="mx-4 mt-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <BiInfoCircle className="text-base shrink-0 text-amber-600" />
                <span>{apiNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setApiNotice(null)}
                className="text-amber-600 font-bold hover:text-amber-900 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
            {loadingMsgs && messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                <FiMessageSquare className="w-6 h-6 stroke-1 text-slate-300 dark:text-slate-600" />
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
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 mb-1">
                        {(m.sender_name?.[0] || 'C').toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                        isOutbound
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-xs'
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
                          <span>
                            {m.status === 'read' ? (
                              <BiCheckDouble className="text-sm" />
                            ) : (
                              <BiCheck className="text-sm" />
                            )}
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
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Send</span>
              <BiSend className="text-base" />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

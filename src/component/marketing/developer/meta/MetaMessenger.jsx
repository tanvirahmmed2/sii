'use client';

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Context } from '@/components/helper/Context';

import {
  BiSearch,
  BiRefresh,
  BiSend,
  BiCheck,
  BiCheckDouble,
  BiErrorCircle,
  BiUser,
  BiCheckCircle,
  BiTimeFive,
  BiLoaderAlt,
  BiInfoCircle,
  BiCheckShield,
  BiShieldX,
  BiDotsVerticalRounded,
  BiPhone,
  BiTrash,
  BiArrowBack,
} from 'react-icons/bi';

export default function MetaMessenger({
  platform = 'facebook',
  title = 'Facebook Messenger',
  subtitle = 'Manage Facebook Page customer conversations and direct replies via Meta Graph API',
  IconComponent,
  brandColor = 'text-blue-600 dark:text-blue-400',
  brandBg = 'bg-blue-600',
  brandBadge = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
}) {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasPlatformPerm = permissions.includes(`${platform}-messages`) || permissions.includes('chats');
  const canManage = Boolean(hasPlatformPerm || permissions.includes('support'));
  const canDelete = Boolean(hasPlatformPerm);

  const [conversations, setConversations] = useState([]);

  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  // 1. Fetch Meta configuration status
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/developer/meta/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to fetch Meta config:', err);
    }
  }, []);

  // 2. Fetch conversations
  const fetchConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingConvs(true);
      const url = `/api/developer/meta/conversations?platform=${platform}&status=${statusFilter}&search=${encodeURIComponent(searchTerm)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setConversations(data.records);
        // Auto-select first conversation on initial load if none selected
        if (!selectedConv && data.records.length > 0 && !silent) {
          setSelectedConv(data.records[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  }, [platform, statusFilter, searchTerm, selectedConv]);

  // 3. Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId, silent = false) => {
    if (!convId) return;
    try {
      if (!silent) setLoadingMsgs(true);
      const res = await fetch(`/api/developer/meta/messages?conversationId=${convId}`);
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
    fetchConfig();
    fetchConversations();
  }, [fetchConfig, fetchConversations]);

  // When selected conversation changes
  useEffect(() => {
    if (selectedConv?.id) {
      fetchMessages(selectedConv.id);
    } else {
      setMessages([]);
    }
  }, [selectedConv?.id, fetchMessages]);

  // Auto scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Background polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConv?.id) {
        fetchMessages(selectedConv.id, true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages, selectedConv?.id]);

  // Send message handler
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedConv?.id || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);
    setApiNotice(null);

    // Optimistic UI message insertion
    const tempMsg = {
      id: `temp_${Date.now()}`,
      conversation_id: selectedConv.id,
      sender_type: 'STAFF',
      sender_name: 'You',
      message_text: text,
      delivery_status: 'SENDING',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/developer/meta/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          messageText: text,
        }),
      });

      const data = await res.json();
      if (data.success && data.record) {
        // Replace temp message with persisted record
        setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? data.record : m)));
        if (data.warning) {
          setApiNotice(data.warning);
        }
        fetchConversations(true);
      } else {
        // Mark delivery failed
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...m, delivery_status: 'FAILED', error_message: data.error } : m))
        );
        setApiNotice(data.error || 'Failed to dispatch message via Meta Graph API.');
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? { ...m, delivery_status: 'FAILED' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  // Toggle conversation status (OPEN <-> RESOLVED)
  const handleToggleStatus = async () => {
    if (!selectedConv?.id || statusUpdating) return;
    const newStatus = selectedConv.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    setStatusUpdating(true);
    try {
      const res = await fetch('/api/developer/meta/conversations', {
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
      const res = await fetch(`/api/developer/meta/conversations?id=${selectedConv.id}`, {
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

  const isValidAvatarUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/');
  };

  const channelConfig = config?.[platform] || {};
  const isConfigured = channelConfig.configured;

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl">
          <BiShieldX />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Your account role (<span className="font-bold capitalize">{role}</span>) does not have permission to manage Meta customer messaging. Access is restricted to Admin, Manager, and Support staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${brandBadge}`}>
            {IconComponent && <IconComponent />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${brandBadge} capitalize`}>
                {platform}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>


        {/* Channel Health Status */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
            />
            <span>{isConfigured ? 'Meta Graph API Connected' : 'Live Credentials Pending'}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchConversations();
              if (selectedConv?.id) fetchMessages(selectedConv.id);
            }}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh messages"
          >
            <BiRefresh className="text-lg" />
          </button>
        </div>
      </div>

      {/* Configuration Advisory (if keys missing) */}
      {!isConfigured && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
          <BiInfoCircle className="text-lg shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <span className="font-semibold">Meta Graph API Environment Setup:</span>
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              {platform === 'facebook' && 'Configure META_PAGE_ACCESS_TOKEN and META_PAGE_ID in .env to transmit live Facebook messages.'}
              {platform === 'instagram' && 'Configure META_PAGE_ACCESS_TOKEN and META_INSTAGRAM_ACCOUNT_ID in .env for Instagram Direct messaging.'}
              {platform === 'whatsapp' && 'Configure META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in .env for WhatsApp Cloud API messaging.'}
              {' Staff can preview threads, manage statuses, and test local storage now.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Two-Pane Messenger Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden h-[680px]">
        {/* Left Pane: Conversation List */}
        <div
          className={`lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-white dark:bg-slate-900 ${
            selectedConv ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search and Filters */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="relative">
              <BiSearch className="absolute left-3 top-2.5 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              {['ALL', 'OPEN', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingConvs ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <BiLoaderAlt className="animate-spin text-2xl mx-auto text-primary" />
                <p className="text-xs">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <BiTimeFive className="text-3xl mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No conversations found</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Incoming messages from {title} will appear here via webhook.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 dark:bg-primary/15 border-l-4 border-primary'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shrink-0 text-sm">
                      {conv.recipient_avatar && isValidAvatarUrl(conv.recipient_avatar) ? (
                        <img
                          src={conv.recipient_avatar}
                          alt={conv.recipient_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        (conv.recipient_name?.[0] || 'C').toUpperCase()
                      )}
                    </div>

                    {/* Meta preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {conv.recipient_name || 'Customer'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.last_message_at || conv.updated_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {conv.last_message || 'No messages yet'}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                            conv.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {conv.status}
                        </span>

                        {conv.recipient_phone && (
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {conv.recipient_phone}
                          </span>
                        )}

                        {conv.unread_count > 0 && (
                          <span className="ml-auto bg-primary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Message Thread & Composer */}
        <div
          className={`lg:col-span-8 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40 ${
            !selectedConv ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Active Conversation Header */}
              <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedConv(null)}
                    className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg cursor-pointer"
                  >
                    <BiArrowBack className="text-xl" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedConv.recipient_name?.[0] || 'C').toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {selectedConv.recipient_name || 'Customer'}
                      </h2>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                          selectedConv.status === 'OPEN'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {selectedConv.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                      <span>ID: {selectedConv.recipient_id}</span>
                      {selectedConv.recipient_phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <BiPhone className="text-xs" />
                            {selectedConv.recipient_phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={statusUpdating}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      selectedConv.status === 'OPEN'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <BiCheckCircle />
                    <span>{selectedConv.status === 'OPEN' ? 'Mark Resolved' : 'Reopen'}</span>
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteConversation}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Delete conversation (Admin & Manager only)"
                    >
                      <BiTrash className="text-base" />
                    </button>
                  )}
                </div>
              </div>

              {/* API Notice / Warning Banner if dispatch failed */}
              {apiNotice && (
                <div className="mx-4 mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <BiErrorCircle className="text-base shrink-0 mt-0.5 text-amber-600" />
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

              {/* Chat Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                    <BiLoaderAlt className="animate-spin text-xl text-primary" />
                    <span className="text-xs">Loading message history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${brandBadge}`}>
                      {IconComponent && <IconComponent />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Start the conversation</h3>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Send a direct reply below. Your message will be routed via Meta Graph API to the user.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender_type === 'STAFF';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {msg.sender_name || (isStaff ? 'Staff' : 'Customer')}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                            isStaff
                              ? `${brandBg} text-white rounded-br-xs`
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap wrap-break-words">{msg.message_text}</p>
                        </div>

                        {/* Status Checkmark for staff messages */}
                        {isStaff && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                            {msg.delivery_status === 'DELIVERED' || msg.delivery_status === 'READ' ? (
                              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                <BiCheckDouble /> Delivered
                              </span>
                            ) : msg.delivery_status === 'SENT' ? (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                <BiCheck /> Sent
                              </span>
                            ) : msg.delivery_status === 'SENDING' ? (
                              <span className="flex items-center gap-0.5 text-slate-400 animate-pulse">
                                <BiLoaderAlt className="animate-spin text-xs" /> Sending...
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-rose-500 font-medium" title={msg.error_message}>
                                <BiErrorCircle /> Failed to send
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Template Replies */}
              <div className="px-4 py-2 bg-white/70 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-slate-400 shrink-0 font-medium">Quick Replies:</span>
                {[
                  'Hello! How can we help you today?',
                  'We are currently investigating your request.',
                  'Thank you for reaching out! Our team has updated your ticket.',
                ].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setInputText(template)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {template}
                  </button>
                ))}
              </div>

              {/* Reply Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Reply via ${title} (Press Enter to send)...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />

                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl ${brandBg} hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer`}
                >
                  {sending ? (
                    <BiLoaderAlt className="animate-spin text-base" />
                  ) : (
                    <>
                      <BiSend className="text-base" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8 space-y-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${brandBadge}`}>
                {IconComponent && <IconComponent />}
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Conversation Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Choose a conversation from the left sidebar to read customer history and dispatch direct replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

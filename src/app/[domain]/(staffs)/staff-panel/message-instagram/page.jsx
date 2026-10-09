'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiSearch,
  FiSend,
  FiRefreshCw,
  FiCheck,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiExternalLink,
  FiUser
} from 'react-icons/fi';
import { FaInstagram } from 'react-icons/fa';

export default function MessageInstagramPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState({ totalThreads: 0, openThreads: 0, totalUnread: 0 });
  const [metaConfig, setMetaConfig] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, [domain]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/messages?platform=instagram`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        setStats(data.stats || { totalThreads: 0, openThreads: 0, totalUnread: 0 });
        setMetaConfig(data.metaConfig || null);

        if (!selectedConv && data.conversations?.length > 0) {
          setSelectedConv(data.conversations[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load Instagram messages:', err);
      setActionError('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/${domain}/staff/panel/messages?platform=instagram&conversationId=${convId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to fetch messages for conversation:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedConv || sending) return;

    const textToSend = replyText.trim();
    setSending(true);
    setActionError(null);

    const tempMessage = {
      id: `temp_${Date.now()}`,
      conversation_id: selectedConv.id,
      platform: 'instagram',
      sender_type: 'STAFF',
      sender_name: 'You',
      message_text: textToSend,
      delivery_status: 'SENDING',
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMessage]);
    setReplyText('');

    try {
      const res = await fetch(`/api/${domain}/staff/panel/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          messageText: textToSend,
          platform: 'instagram'
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch direct message to Instagram.');
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? data.message : m))
      );

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id
            ? { ...c, last_message: textToSend, last_message_at: new Date().toISOString() }
            : c
        )
      );

      if (data.dispatchError) {
        setActionError(`Saved locally, but Instagram dispatch reported: ${data.dispatchError}`);
      }
    } catch (err) {
      setActionError(err.message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMessage.id ? { ...m, delivery_status: 'FAILED', error_message: err.message } : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (convId, newStatus) => {
    try {
      const res = await fetch(`/api/${domain}/staff/panel/messages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, status: newStatus } : c))
        );
        if (selectedConv?.id === convId) {
          setSelectedConv((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteConversation = async (convId) => {
    if (!window.confirm('Delete this conversation thread and its messages?')) return;
    try {
      const res = await fetch(`/api/${domain}/staff/panel/messages?conversationId=${convId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (selectedConv?.id === convId) {
          setSelectedConv(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      (c.recipient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.last_message || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasPageToken = Boolean(metaConfig?.instagram?.configured);

  return (
    <div className="w-full space-y-4">
      {/* Header & KPI Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FaInstagram className="text-pink-600" size={18} /> Instagram Direct
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Direct messages and story replies received by your institution's connected Instagram professional account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <span>{stats.totalThreads} Threads</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-emerald-600 dark:text-emerald-400">{stats.openThreads} Open</span>
            {stats.totalUnread > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-pink-600 font-semibold">{stats.totalUnread} Unread</span>
              </>
            )}
          </div>

          <button
            onClick={fetchConversations}
            disabled={loading}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50"
            title="Refresh Conversations"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={14} />
          </button>
        </div>
      </div>

      {/* Meta Token Alert Banner */}
      {!hasPageToken && (
        <div className="p-3 rounded text-xs bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 text-pink-900 dark:text-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="text-pink-600 shrink-0" size={16} />
            <span>
              <strong>Notice:</strong> <code className="font-mono bg-pink-100 dark:bg-pink-900/60 px-1 rounded">META_PAGE_ACCESS_TOKEN</code> is required for outbound replies to Instagram users.
            </span>
          </div>
          <Link
            href="/staff-panel/configure-meta"
            className="px-2.5 py-1 rounded text-[11px] font-medium bg-pink-600 hover:bg-pink-700 text-white shrink-0 flex items-center gap-1 transition"
          >
            Configure in Meta Settings <FiExternalLink />
          </Link>
        </div>
      )}

      {actionError && (
        <div className="p-2.5 rounded text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs text-rose-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Split Chat Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xs overflow-hidden">
        {/* Left Column: Sidebar (4 cols) */}
        <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Instagram users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-pink-600"
              />
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              {['ALL', 'OPEN', 'RESOLVED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[500px]">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <FaInstagram className="mx-auto mb-2 text-slate-300 dark:text-slate-700" size={24} />
                <p>No Instagram conversations.</p>
                <p className="text-[11px] text-slate-400 mt-1">Direct messages received via Meta webhook will appear here.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`p-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-pink-50/70 dark:bg-pink-950/40 border-l-2 border-pink-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                          {conv.recipient_name ? conv.recipient_name.charAt(0).toUpperCase() : <FiUser />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {conv.recipient_name || 'Instagram User'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {conv.last_message || 'No messages'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-pink-600 text-white">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white flex items-center justify-center font-semibold text-xs">
                    {selectedConv.recipient_name ? selectedConv.recipient_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {selectedConv.recipient_name || 'Instagram User'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        IG
                      </span>
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Channel: Instagram Direct • Status: {selectedConv.status || 'OPEN'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedConv.status || 'OPEN'}
                    onChange={(e) => handleUpdateStatus(selectedConv.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                  >
                    <option value="OPEN">Open</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="SPAM">Spam</option>
                  </select>

                  <button
                    onClick={() => handleDeleteConversation(selectedConv.id)}
                    className="p-1.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Delete Conversation"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[420px] bg-slate-50/20 dark:bg-slate-950/10">
                {messagesLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <FiRefreshCw className="animate-spin" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No messages in this thread.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender_type === 'STAFF';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                            isStaff
                              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 px-1">
                          <span>
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                          {isStaff && (
                            <span>
                              {msg.delivery_status === 'SENT' ? (
                                <FiCheckCircle className="text-emerald-500 inline" size={10} />
                              ) : msg.delivery_status === 'SENDING' ? (
                                <span className="text-amber-500 text-[9px]">sending...</span>
                              ) : msg.delivery_status === 'FAILED' ? (
                                <span className="text-rose-500 text-[9px]" title={msg.error_message}>failed</span>
                              ) : (
                                <FiCheck className="inline" size={10} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    placeholder="Type your response... (Press Enter to send, Shift+Enter for new line)"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 text-xs px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-pink-600 resize-none transition"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-4 py-2 rounded text-xs font-medium bg-pink-600 hover:bg-pink-700 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 h-[42px]"
                  >
                    <FiSend /> {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <FaInstagram size={36} className="text-slate-200 dark:text-slate-800 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select a Conversation</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Choose an Instagram thread from the left sidebar to respond to student and community inquiries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiTrash2,
  FiSend,
  FiUser,
  FiShield,
  FiAlertCircle,
  FiLoader,
  FiCheckCircle,
  FiClock,
  FiMessageSquare,
  FiX,
} from 'react-icons/fi';
import ChatUsersSwipeBar from 'src/component/marketing/developer/ChatUsersSwipeBar';

export default function SingleLiveChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id;

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [allChats, setAllChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat details and message stream
  const fetchChatDetails = useCallback(async (showLoading = false) => {
    if (!chatId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/marketing/developer/live_chats?chatId=${chatId}`);
      const data = await res.json();
      if (data.success && data.chat) {
        setChat(data.chat);
        setMessages(data.messages || []);
        if (data.developers) setDevelopers(data.developers);
        if (data.currentUser) setCurrentUser(data.currentUser);
      } else {
        setError(data.error || 'Live chat session not found.');
      }
    } catch (err) {
      console.error('Error fetching live chat details:', err);
      setError('Network error while loading live chat.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [chatId]);

  // Fetch all chats for the top swipe bar
  const fetchAllChats = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/developer/live_chats');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setAllChats(data.records);
      }
    } catch (e) {
      console.error('Failed to fetch live chats for bar:', e);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchChatDetails(true);
    fetchAllChats();
  }, [fetchChatDetails, fetchAllChats]);

  // Real-time live polling every 3-4 seconds for visitor replies and chat list updates
  useEffect(() => {
    if (!chatId) return;
    const interval = setInterval(() => {
      fetchChatDetails(false);
      fetchAllChats();
    }, 4000);
    return () => clearInterval(interval);
  }, [chatId, fetchChatDetails, fetchAllChats]);

  const handleManualRefresh = async () => {
    if (!chatId || refreshing) return;
    setRefreshing(true);
    await fetchChatDetails(false);
    setRefreshing(false);
  };

  // Permitted developer sends reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || !chatId || sendingReply) return;

    const text = replyMessage.trim();
    setReplyMessage('');
    setSendingReply(true);

    try {
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: Number(chatId),
          message: text,
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setMessages((prev) => [...prev, data.record]);
        if (chat) {
          setChat((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'ACTIVE',
                  assigned_developer_id: prev.assigned_developer_id || currentUser?.id,
                  assigned_developer_name: prev.assigned_developer_name || currentUser?.name,
                }
              : prev
          );
        }
      } else {
        notify(data.error || 'Failed to dispatch reply.', 'error');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      notify('Error sending message. Please try again.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Update chat status
  const handleStatusChange = async (newStatus) => {
    if (!chatId || statusLoading) return;
    setStatusLoading(true);
    try {
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(chatId),
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChat((prev) => (prev ? { ...prev, status: newStatus } : prev));
        notify(`Chat status updated to ${newStatus}.`);
      } else {
        notify(data.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      console.error('Error changing status:', err);
      notify('Error changing status.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Assign developer to this chat session
  const handleAssignDeveloper = async (developerId) => {
    if (!chatId || assignLoading) return;
    setAssignLoading(true);
    try {
      const devId = developerId ? Number(developerId) : null;
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(chatId),
          assigned_developer_id: devId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const assignedDev = developers.find((d) => Number(d.id) === devId);
        setChat((prev) =>
          prev
            ? {
                ...prev,
                assigned_developer_id: devId,
                assigned_developer_name: assignedDev ? assignedDev.name : null,
              }
            : prev
        );
        notify(assignedDev ? `Assigned to ${assignedDev.name}.` : 'Chat session unassigned.');
      } else {
        notify(data.error || 'Failed to assign developer.', 'error');
      }
    } catch (err) {
      console.error('Error assigning developer:', err);
      notify('Error assigning developer.', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  // Delete chat session
  const handleDeleteChat = async () => {
    if (!confirm('Are you sure you want to permanently delete this chat session? All message history will be removed.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/marketing/developer/live_chats?id=${chatId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/live-chats');
      } else {
        notify(data.error || 'Failed to delete chat.', 'error');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
      notify('Error deleting chat session.', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-500">
        <FiRefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-normal">Connecting to live chat stream #{chatId}...</p>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs space-y-4">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl flex items-center justify-center text-3xl mx-auto">
            <FiAlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Chat Session Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || `The chat session with ID #${chatId} does not exist or has been deleted.`}
          </p>
          <Link
            href="/developer/live-chats"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to Live Chat Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  const status = String(chat.status || 'OPEN').toUpperCase();
  const isAssignedToMe = currentUser && Number(chat.assigned_developer_id) === Number(currentUser.id);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Touch-Swipeable Visitors Bar */}
      <ChatUsersSwipeBar
        users={allChats.map((c) => ({
          id: c.id,
          name: c.visitor_name || 'Visitor',
          avatar: null,
          lastMessageAt: c.last_message_at || c.updated_at || c.created_at,
          unreadCount: c.unread_count || 0,
          href: `/developer/live-chats/${c.id}`,
        }))}
        activeId={chatId}
      />

      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? <FiAlertCircle className="w-4 h-4 shrink-0" /> : <FiCheckCircle className="w-4 h-4 shrink-0" />}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Top Action & Session Management Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/developer/live-chats"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Back to All Live Chats"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {chat.visitor_name}
              </h1>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                #{chat.id}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    : status === 'OPEN'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                    : status === 'RESOLVED'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {status}
              </span>

              {/* Assigned Developer Chip */}
              {chat.assigned_developer_name ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                  <FiShield className="w-3 h-3" />
                  <span>Assigned: {chat.assigned_developer_name}</span>
                </span>
              ) : (
                <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Unassigned
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>{chat.visitor_email || 'No email provided'}</span>
              {chat.ip_address && <span>&bull; IP: {chat.ip_address}</span>}
              <span>
                &bull; Started{' '}
                {new Date(chat.created_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          </div>
        </div>

        {/* Developer Action Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Quick "Assign to Me" button */}
          {currentUser && !isAssignedToMe && (
            <button
              type="button"
              disabled={assignLoading}
              onClick={() => handleAssignDeveloper(currentUser.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
              title="Assign this live chat to me"
            >
              <FiShield className="w-3.5 h-3.5" />
              <span>Assign to Me</span>
            </button>
          )}

          {/* Re-assign Developer Selector */}
          <select
            value={chat.assigned_developer_id || ''}
            disabled={assignLoading}
            onChange={(e) => handleAssignDeveloper(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-normal focus:outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-50 transition-colors"
            title="Reassign developer"
          >
            <option value="">Assign Developer...</option>
            {developers.map((dev) => (
              <option key={dev.id} value={dev.id}>
                {dev.name} ({dev.role_name || 'Staff'})
              </option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={status}
            disabled={statusLoading}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <option value="OPEN">Status: OPEN</option>
            <option value="ACTIVE">Status: ACTIVE</option>
            <option value="RESOLVED">Status: RESOLVED</option>
            <option value="CLOSED">Status: CLOSED</option>
          </select>

          {/* Refresh */}
          <button
            type="button"
            disabled={refreshing}
            onClick={handleManualRefresh}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh stream"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Delete */}
          <button
            type="button"
            disabled={deleting}
            onClick={handleDeleteChat}
            className="p-2 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer disabled:opacity-50"
            title="Delete chat session"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col h-[600px] sm:h-[660px]">
        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-950/30">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2">
              <FiMessageSquare className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-normal">No messages in this chat session yet.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isStaff = ['ADMIN', 'STAFF', 'DEVELOPER'].includes(String(msg.sender_type || '').toUpperCase());
              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {isStaff
                        ? msg.sender_name || 'Support Specialist'
                        : `${msg.sender_name || chat.visitor_name} (Visitor)`}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                      isStaff
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box Footer */}
        <form
          onSubmit={handleSendReply}
          className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-3"
        >
          <input
            type="text"
            required
            placeholder={`Reply to ${chat.visitor_name} as ${currentUser?.name || 'Support'} (Press Enter to send)...`}
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
          />

          <button
            type="submit"
            disabled={!replyMessage.trim() || sendingReply}
            className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            {sendingReply ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Send Reply</span>
                <FiSend className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

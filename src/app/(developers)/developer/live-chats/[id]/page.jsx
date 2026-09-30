'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiRefresh,
  BiTrash,
  BiSend,
  BiSupport,
  BiUser,
  BiCheckCircle,
  BiTimeFive,
  BiLoaderAlt,
  BiEnvelope,
  BiGlobe,
  BiMessageSquareDetail,
  BiCheck,
  BiUserCheck,
  BiCheckDouble,
} from 'react-icons/bi';

export default function SingleLiveChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id;

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      const res = await fetch(`/api/developer/live_chats?chatId=${chatId}`);
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

  // Initial fetch
  useEffect(() => {
    fetchChatDetails(true);
  }, [fetchChatDetails]);

  // Real-time live polling every 3 seconds for visitor replies
  useEffect(() => {
    if (!chatId) return;
    const interval = setInterval(() => {
      fetchChatDetails(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [chatId, fetchChatDetails]);

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
      const res = await fetch('/api/developer/live_chats', {
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
        alert(data.error || 'Failed to dispatch reply.');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Error sending message. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  // Update chat status
  const handleStatusChange = async (newStatus) => {
    if (!chatId || statusLoading) return;
    setStatusLoading(true);
    try {
      const res = await fetch('/api/developer/live_chats', {
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
      } else {
        alert(data.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error changing status:', err);
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
      const res = await fetch('/api/developer/live_chats', {
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
      } else {
        alert(data.error || 'Failed to assign developer.');
      }
    } catch (err) {
      console.error('Error assigning developer:', err);
    } finally {
      setAssignLoading(false);
    }
  };

  // Delete chat session
  const handleDeleteChat = async () => {
    if (!confirm('Are you sure you want to permanently delete this chat session? All message history will be removed.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/developer/live_chats?id=${chatId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/developer/live-chats');
      } else {
        alert(data.error || 'Failed to delete chat.');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
      alert('Error deleting chat session.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-500">
        <BiLoaderAlt className="animate-spin text-3xl text-slate-800" />
        <p className="text-xs font-semibold">Connecting to live chat stream #{chatId}...</p>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
            <BiMessageSquareDetail />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Chat Session Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || `The chat session with ID #${chatId} does not exist or has been deleted.`}
          </p>
          <Link
            href="/developer/live-chats"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <BiArrowBack className="text-base" />
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
      {/* Top Action & Session Management Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/developer/live-chats"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
            title="Back to All Live Chats"
          >
            <BiArrowBack className="text-lg" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {chat.visitor_name}
              </h1>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                #{chat.id}
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
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

              {/* Assigned Developer Chip */}
              {chat.assigned_developer_name ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  <BiUserCheck className="text-xs" />
                  <span>Assigned: {chat.assigned_developer_name}</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Unassigned
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>{chat.visitor_email || 'No email provided'}</span>
              {chat.ip_address && <span>• IP: {chat.ip_address}</span>}
              <span>
                • Started{' '}
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
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Quick "Assign to Me" button */}
          {currentUser && !isAssignedToMe && (
            <button
              type="button"
              disabled={assignLoading}
              onClick={() => handleAssignDeveloper(currentUser.id)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
              title="Assign this live chat to me"
            >
              <BiUserCheck className="text-sm" />
              <span>Assign to Me</span>
            </button>
          )}

          {/* Re-assign Developer Selector */}
          <select
            value={chat.assigned_developer_id || ''}
            disabled={assignLoading}
            onChange={(e) => handleAssignDeveloper(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-slate-800 cursor-pointer disabled:opacity-50 transition-colors"
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
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-slate-800 cursor-pointer disabled:opacity-50 transition-colors"
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
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh stream"
          >
            <BiRefresh className={`text-lg ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
          </button>

          {/* Delete */}
          <button
            type="button"
            disabled={deleting}
            onClick={handleDeleteChat}
            className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Delete chat session"
          >
            {deleting ? <BiLoaderAlt className="animate-spin text-lg" /> : <BiTrash className="text-lg" />}
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[680px]">
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2">
              <BiMessageSquareDetail className="text-4xl text-slate-300" />
              <p className="text-xs font-semibold">No messages in this chat session yet.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isStaff = msg.sender_type === 'ADMIN';
              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-600">
                      {isStaff
                        ? msg.sender_name || 'Support Specialist'
                        : `${msg.sender_name || chat.visitor_name} (Visitor)`}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                    {isStaff && msg.is_read && (
                      <BiCheckDouble className="text-indigo-600 text-xs" title="Read by visitor" />
                    )}
                  </div>

                  <div
                    className={`max-w-[78%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isStaff
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
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
          className="p-4 bg-white border-t border-slate-200 flex items-center gap-3"
        >
          <input
            type="text"
            required
            placeholder={`Reply to ${chat.visitor_name} as ${currentUser?.name || 'Support'} (Press Enter to send)...`}
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
          />

          <button
            type="submit"
            disabled={!replyMessage.trim() || sendingReply}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
          >
            {sendingReply ? (
              <>
                <BiLoaderAlt className="animate-spin text-base" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send Reply</span>
                <BiSend className="text-base" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

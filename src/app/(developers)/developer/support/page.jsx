'use client';

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import ChatUsersSwipeBar from 'src/component/marketing/developer/ChatUsersSwipeBar';

export default function SupportChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTicketId = searchParams.get('id') || searchParams.get('ticketId');

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canReply = permissions.includes('support') || user?.role === 'admin' || user?.role === 'developer' || user?.role === 'manager';

  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 4000);
  };

  // 1. Fetch tickets list
  const fetchTickets = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/support');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setTickets(data.records);

        if (data.records.length > 0) {
          const sorted = [...data.records].sort((a, b) => {
            const timeA = a.last_message_at || a.updated_at || a.created_at;
            const timeB = b.last_message_at || b.updated_at || b.created_at;
            return new Date(timeB) - new Date(timeA);
          });
          setActiveTicketId((prev) => {
            if (prev && data.records.some((t) => String(t.id) === String(prev))) return prev;
            return queryTicketId || sorted[0].id;
          });
        } else {
          setActiveTicketId(null);
          setActiveTicket(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch support tickets:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [queryTicketId]);

  useEffect(() => {
    fetchTickets(true);
  }, [fetchTickets]);

  // 2. Fetch active ticket details and messages
  const fetchTicketDetails = useCallback(async (ticketId, showLoading = false) => {
    if (!ticketId) return;
    try {
      if (showLoading) setLoadingMessages(true);
      const res = await fetch(`/api/marketing/developer/support/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setActiveTicket(data.ticket);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeTicketId) {
      fetchTicketDetails(activeTicketId, true);
    }
  }, [activeTicketId, fetchTicketDetails]);

  // Silent polling every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets(false);
      if (activeTicketId) {
        fetchTicketDetails(activeTicketId, false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicketId, fetchTickets, fetchTicketDetails]);

  // Send reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const text = replyMessage.trim();
    if (!text || !activeTicketId || sendingReply || !canReply) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/marketing/developer/support/${activeTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          status: activeTicket?.status === 'resolved' ? 'in_progress' : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        await fetchTicketDetails(activeTicketId, false);
        await fetchTickets(false);
      } else {
        notify(data.error || 'Failed to send reply', 'error');
      }
    } catch (err) {
      console.error('Error sending support reply:', err);
      notify('Network error sending message', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Toggle ticket status
  const handleToggleStatus = async (newStatus) => {
    if (!activeTicketId) return;
    try {
      const res = await fetch(`/api/marketing/developer/support/${activeTicketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        notify(`Ticket updated to ${newStatus}`);
        await fetchTicketDetails(activeTicketId, false);
        await fetchTickets(false);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Touch-Swipeable Visitors Bar */}
      <ChatUsersSwipeBar
        users={tickets.map((t) => ({
          id: t.id,
          name: t.requester_name || t.creator_name || 'Creator',
          avatar: t.creator_avatar,
          lastMessageAt: t.last_message_at || t.updated_at || t.created_at,
          unreadCount: t.unread_count || 0,
          active: String(t.id) === String(activeTicketId),
          onClick: () => setActiveTicketId(t.id),
        }))}
        activeId={activeTicketId}
      />

      {/* Main Content Area */}
      {loading && tickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center text-slate-400">
          <span className="text-xs font-normal">Loading support chats...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No chats are available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            There are currently no active support tickets or conversations.
          </p>
          <Link
            href="/developer/support/details"
            className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Workspace Details
          </Link>
        </div>
      ) : activeTicket ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden flex flex-col h-[650px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
                {(activeTicket.requester_name || activeTicket.creator_name || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {activeTicket.requester_name || activeTicket.creator_name || 'Support Requester'}
                  </h2>
                  <span className="text-[10px] text-slate-400 font-mono">#{activeTicket.id}</span>
                  <span
                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                      String(activeTicket.status).toLowerCase() === 'resolved'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                        : String(activeTicket.status).toLowerCase() === 'in_progress'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                    }`}
                  >
                    {activeTicket.status || 'OPEN'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeTicket.subject}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {String(activeTicket.status).toLowerCase() !== 'resolved' ? (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('resolved')}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  Resolve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('in_progress')}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  Re-open
                </button>
              )}

              <Link
                href="/developer/support/details"
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                Details
              </Link>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
            {/* Initial ticket message */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeTicket.requester_name || activeTicket.creator_name || 'Requester'} (Original Inquiry)
                </span>
                <span>{activeTicket.created_at ? new Date(activeTicket.created_at).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {activeTicket.message}
              </p>
            </div>

            {loadingMessages && messages.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                Loading conversation stream...
              </div>
            ) : (
              messages.map((m) => {
                const isStaff = m.sender_type === 'developer' || m.sender_type === 'admin' || m.sender_type === 'staff';
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isStaff ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isStaff && (
                      <div className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-[10px] shrink-0 mb-1">
                        {(m.sender_name || 'C').charAt(0).toUpperCase()}
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
                        <span className="font-semibold">{m.sender_name || (isStaff ? 'Support Staff' : 'Creator')}</span>
                        <span>•</span>
                        <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={handleSendReply}
            className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Reply to ${activeTicket.requester_name || activeTicket.creator_name || 'creator'}...`}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              disabled={sendingReply || !canReply}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
            <button
              type="submit"
              disabled={!replyMessage.trim() || sendingReply || !canReply}
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

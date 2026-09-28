'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BiArrowBack,
  BiSend,
  BiRefresh,
  BiCheckCircle,
  BiTimeFive,
  BiLoaderAlt,
  BiSupport,
  BiUser,
  BiX,
  BiCheckShield,
} from 'react-icons/bi';

export default function CreatorSingleTicketPage() {
  const params = useParams();
  const creatorId = params?.id;
  const ticketId = params?.ticketId;

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch ticket and messages
  const fetchTicketThread = useCallback(async (showLoading = false) => {
    if (!ticketId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/creator/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setImages(data.images || []);
      } else {
        setError(data.error || 'Support ticket not found.');
      }
    } catch (err) {
      console.error('Error loading ticket thread:', err);
      setError('Network error while loading ticket conversation.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Initial load
  useEffect(() => {
    fetchTicketThread(true);
  }, [fetchTicketThread]);

  // Live polling every 4s like live_chat
  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      fetchTicketThread(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [ticketId, fetchTicketThread]);

  const handleManualRefresh = async () => {
    if (!ticketId || refreshing) return;
    setRefreshing(true);
    await fetchTicketThread(false);
    setRefreshing(false);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || sendingReply || !ticketId) return;

    const messageText = replyMessage.trim();
    setSendingReply(true);

    try {
      const res = await fetch(`/api/creator/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: Number(creatorId),
          message: messageText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (data.ticket) {
          setTicket(data.ticket);
        }
      } else {
        alert(data.error || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Network error while dispatching message.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4 animate-spin">
          <BiLoaderAlt className="text-2xl" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Loading Support Thread...</h3>
        <p className="text-xs text-slate-500">Connecting to support engineers and loading conversation history.</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <BiX className="text-2xl" />
        </div>
        <h3 className="text-base font-bold text-slate-900">{error || 'Ticket Not Found'}</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The requested support ticket could not be loaded. Please return to your tickets list.
        </p>
        <Link
          href={`/creator/${creatorId}/tickets`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <BiArrowBack className="text-base" />
          <span>Back to Tickets</span>
        </Link>
      </div>
    );
  }

  const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  const statusColors = {
    OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/creator/${creatorId}/tickets`}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <BiArrowBack className="text-base" />
              <span>All Tickets</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono font-bold text-slate-900">{ticket.ticket_number}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{ticket.subject}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                statusColors[ticket.status] || statusColors.OPEN
              }`}
            >
              {ticket.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            <span>
              Category: <strong className="text-slate-700 font-semibold">{ticket.category}</strong>
            </span>
            <span>•</span>
            <span>
              Priority: <strong className="text-slate-700 font-semibold">{ticket.priority}</strong>
            </span>
            <span>•</span>
            <span>
              Staff Support:{' '}
              <strong className="text-indigo-600 font-semibold">
                {ticket.assigned_developer_name || 'Engineering Team'}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
            title="Refresh messages"
          >
            <BiRefresh className={`text-base ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* Resolved Warning Banner */}
      {isResolved && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-lg text-emerald-600 shrink-0" />
            <span>
              This ticket has been marked as <strong>{ticket.status}</strong>. If you still need help, sending a message below will automatically re-open it.
            </span>
          </div>
        </div>
      )}

      {/* Conversation Thread Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[600px]">
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <BiSupport className="text-4xl mx-auto mb-2 opacity-50" />
              <p className="text-xs">No messages yet. Send a message to start the conversation.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isStaff = m.sender_type === 'DEVELOPER' || m.sender_type === 'ADMIN';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] px-1">
                    {isStaff ? (
                      <>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <BiCheckShield className="text-indigo-600 text-sm" />
                          <span>{m.sender_name || 'Support Staff'}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[9px] uppercase border border-indigo-200">
                          {m.developer_role || 'Staff'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <BiUser className="text-slate-400 text-sm" />
                          <span>You ({m.sender_name || 'Creator'})</span>
                        </span>
                      </>
                    )}
                    <span className="text-slate-400">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div
                    className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                      isStaff
                        ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                        : 'bg-slate-900 text-white border border-slate-800 rounded-tr-sm'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="relative">
              <textarea
                rows={3}
                required
                disabled={sendingReply}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here... Press Enter to send, Shift+Enter for a new line."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 pr-14 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-all disabled:opacity-60 leading-relaxed resize-none"
              />
              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim()}
                className="absolute right-3 bottom-4 w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                title="Send Message"
              >
                {sendingReply ? (
                  <BiLoaderAlt className="animate-spin text-sm" />
                ) : (
                  <BiSend className="text-base" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <BiTimeFive className="text-xs" />
                <span>Live auto-sync active • Support team receives notifications immediately</span>
              </span>
              <span>Enter to send</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

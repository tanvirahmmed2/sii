'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CreatorSingleTicketPage() {
  const params = useParams();
  const creatorId = params?.id;
  const ticketId = params?.ticketId;

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
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

  const fetchTicketThread = useCallback(async (showLoading = false) => {
    if (!ticketId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/marketing/creator/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'Support ticket not found.');
      }
    } catch (err) {
      setError('Network error loading conversation.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicketThread(true);
  }, [fetchTicketThread]);

  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      fetchTicketThread(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [ticketId, fetchTicketThread]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchTicketThread(false);
    setRefreshing(false);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/marketing/creator/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          senderType: 'CREATOR',
          creatorId: Number(creatorId),
          message: replyMessage.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        await fetchTicketThread(false);
      } else {
        alert(data.error || 'Failed to send message.');
      }
    } catch {
      alert('Network error sending message.');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 font-medium">
        Loading ticket thread...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="w-full py-8 text-center space-y-3 text-xs">
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {error || 'Ticket not found.'}
        </div>
        <Link
          href={`/creator/${creatorId}/tickets`}
          className="text-slate-800 font-semibold underline"
        >
          &larr; Back to Tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/creator/${creatorId}/tickets`}
          className="text-slate-600 hover:text-slate-900 font-medium"
        >
          &larr; Back to Tickets
        </Link>
        <button
          type="button"
          onClick={handleManualRefresh}
          className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Ticket Details Header */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500 font-medium">{ticket.ticket_number}</span>
            <span className="font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
              {ticket.priority}
            </span>
            <span
              className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {ticket.status}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ''}
          </span>
        </div>

        <h1 className="text-sm font-semibold text-slate-900">{ticket.subject}</h1>
        {ticket.description && (
          <p className="text-slate-600 text-xs bg-slate-50 p-2.5 rounded border border-slate-100">
            {ticket.description}
          </p>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-xs font-semibold text-slate-900">
            Conversation ({messages.length})
          </h2>
        </div>

        <div className="space-y-3 min-h-[160px] max-h-[400px] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-slate-400 italic text-center py-6">
              No replies yet. An agent will respond shortly.
            </p>
          ) : (
            messages.map((m) => {
              const isCreator = m.sender_type === 'CREATOR';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-700">
                      {isCreator ? 'You' : m.sender_name || 'Support Agent'}
                    </span>
                    <span>&middot;</span>
                    <span className="font-mono">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded max-w-md text-xs leading-normal ${
                      isCreator
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
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

        {/* Reply Form */}
        <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            required
            placeholder="Type your message..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          />
          <button
            type="submit"
            disabled={sendingReply || !replyMessage.trim()}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50 cursor-pointer"
          >
            {sendingReply ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

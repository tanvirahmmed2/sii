'use client';

import { useState, useEffect, useRef, useCallback, useContext } from 'react';
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
  BiCheckShield,
  BiLinkExternal,
  BiX,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function SingleSupportTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id;

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canDelete = permissions.includes('support');
  const canReply = permissions.includes('support');

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [targetStatus, setTargetStatus] = useState('IN_PROGRESS');
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

  // Fetch ticket and message thread
  const fetchTicketDetails = useCallback(async (showLoading = false) => {
    if (!ticketId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/developer/support/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setImages(data.images || []);
        if (data.staffMembers) setStaffMembers(data.staffMembers);
        setTargetStatus(data.ticket.status === 'RESOLVED' ? 'RESOLVED' : 'IN_PROGRESS');
      } else {
        setError(data.error || 'Support ticket not found.');
      }
    } catch (err) {
      console.error('Error fetching support ticket details:', err);
      setError('Network error while loading ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Initial load
  useEffect(() => {
    fetchTicketDetails(true);
  }, [fetchTicketDetails]);

  // Live polling every 3.5s like live_chats
  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      fetchTicketDetails(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [ticketId, fetchTicketDetails]);

  const handleManualRefresh = async () => {
    if (!ticketId || refreshing) return;
    setRefreshing(true);
    await fetchTicketDetails(false);
    setRefreshing(false);
  };

  // Change ticket status
  const handleStatusChange = async (newStatus) => {
    if (!ticketId || statusLoading) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/developer/support/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket(data.ticket);
        notify(`Ticket status updated to ${newStatus}.`);
      } else {
        notify(data.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      console.error('Error changing status:', err);
      notify('Network error updating status.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Assign developer
  const handleAssignDeveloper = async (devId) => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/developer/support/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_developer_id: devId }),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket((prev) => ({ ...prev, ...data.ticket }));
        notify('Ticket assignee updated.');
        fetchTicketDetails(false);
      } else {
        notify(data.error || 'Failed to update assignee.', 'error');
      }
    } catch (err) {
      console.error('Error assigning developer:', err);
      notify('Network error assigning staff.', 'error');
    }
  };

  // Send developer reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || !ticketId || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/developer/support/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage.trim(),
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (data.ticket) {
          setTicket((prev) => ({ ...prev, ...data.ticket }));
        }
        notify('Reply sent to creator and email notification dispatched.');
      } else {
        notify(data.error || 'Failed to send reply.', 'error');
      }
    } catch (err) {
      console.error('Error sending staff reply:', err);
      notify('Network error sending reply.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Delete ticket
  const handleDeleteTicket = async () => {
    if (!canDelete) {
      notify('Permission denied: support permission required to delete tickets.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this support ticket? This action cannot be undone.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/developer/support/${ticketId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        notify('Ticket deleted. Redirecting...');
        setTimeout(() => {
          router.push('/developer/support');
        }, 1000);
      } else {
        notify(data.error || 'Failed to delete ticket.', 'error');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting ticket:', err);
      notify('Network error deleting ticket.', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 animate-spin">
          <BiLoaderAlt className="text-2xl" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Loading Support Thread...</h3>
        <p className="text-xs text-slate-500">Connecting to creator support channel and syncing messages.</p>
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
          The requested support ticket could not be found or has been removed.
        </p>
        <Link
          href="/developer/support"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <BiArrowBack className="text-base" />
          <span>Back to All Tickets</span>
        </Link>
      </div>
    );
  }

  const statusColors = {
    OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const priorityColors = {
    URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    MEDIUM: 'bg-slate-100 text-slate-700 border-slate-200',
    LOW: 'bg-slate-50 text-slate-500 border-slate-200',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-base" />
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <BiX className="text-base" />
          </button>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/developer/support"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <BiArrowBack className="text-base" />
              <span>Support Dashboard</span>
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
            <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] uppercase ${priorityColors[ticket.priority] || priorityColors.MEDIUM}`}>
              {ticket.priority || 'MEDIUM'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            <span>
              Requester:{' '}
              <strong className="text-slate-800 font-semibold">{ticket.creator_name || ticket.requester_name}</strong>
            </span>
            <span>•</span>
            <span className="font-mono text-slate-600">{ticket.requester_email}</span>
            {ticket.creator_id && (
              <>
                <span>•</span>
                <Link
                  href={`/developer/creators/${ticket.creator_id}`}
                  className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
                >
                  <span>View Creator Profile</span>
                  <BiLinkExternal className="text-xs" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {/* Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Status:</span>
            <select
              value={ticket.status}
              disabled={statusLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Assignee Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Assigned:</span>
            <select
              value={ticket.assigned_developer_id || ''}
              onChange={(e) => handleAssignDeveloper(e.target.value || null)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="">Unassigned</option>
              {staffMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={handleManualRefresh}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs transition-colors cursor-pointer"
            title="Live Sync"
          >
            <BiRefresh className={`text-base ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteTicket}
              className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs transition-colors cursor-pointer"
              title="Delete Ticket"
            >
              <BiTrash className="text-base" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation Thread & Live Stream Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[640px]">
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="py-24 text-center text-slate-400">
              <BiSupport className="text-4xl mx-auto mb-2 opacity-50" />
              <p className="text-xs">No messages in this ticket thread yet.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isStaff = m.sender_type === 'DEVELOPER' || m.sender_type === 'ADMIN';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] px-1">
                    {isStaff ? (
                      <>
                        <span className="font-bold text-indigo-700 flex items-center gap-1">
                          <BiCheckShield className="text-indigo-600 text-sm" />
                          <span>{m.sender_name || 'Staff Support'}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[9px] uppercase border border-indigo-200">
                          {m.developer_role || 'Staff'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <BiUser className="text-slate-400 text-sm" />
                          <span>{m.sender_name || ticket.requester_name || 'Creator'}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-semibold text-[9px] uppercase border border-slate-200">
                          Creator
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
                        ? 'bg-indigo-600 text-white border border-indigo-600 rounded-tr-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
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

        {/* Composer Form */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSendReply} className="space-y-3">
            <div className="relative">
              <textarea
                rows={3}
                required
                disabled={sendingReply || !canReply}
                onKeyDown={handleKeyDown}
                placeholder={
                  canReply
                    ? 'Reply to creator... Press Enter to send, Shift+Enter for a new line.'
                    : 'You do not have permission to reply.'
                }
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 pr-14 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-60 leading-relaxed resize-none"
              />
              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim() || !canReply}
                className="absolute right-3 bottom-4 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                title="Send Reply"
              >
                {sendingReply ? (
                  <BiLoaderAlt className="animate-spin text-sm" />
                ) : (
                  <BiSend className="text-base" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 px-1">
              <div className="flex items-center gap-2">
                <span>Status on reply:</span>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none"
                >
                  <option value="IN_PROGRESS">Keep In Progress</option>
                  <option value="RESOLVED">Mark as Resolved</option>
                  <option value="CLOSED">Mark as Closed</option>
                </select>
                <span className="text-slate-400">• Email notification sent to creator</span>
              </div>
              <span className="text-slate-400">Enter to send</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

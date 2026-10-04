'use client';

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiSend,
  FiTrash2,
  FiRefreshCw,
  FiUser,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiX,
  FiMessageSquare,
  FiPaperclip,
} from 'react-icons/fi';
import { Context } from 'src/component/helper/Context';

export default function SingleSupportTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id;

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canDelete = permissions.includes('support') || user?.role === 'admin' || user?.role === 'manager';
  const canReply = permissions.includes('support') || user?.role === 'admin' || user?.role === 'developer' || user?.role === 'manager';

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
  const [targetStatus, setTargetStatus] = useState('in_progress');
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
      const res = await fetch(`/api/marketing/developer/support/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setImages(data.images || []);
        if (data.staffMembers) setStaffMembers(data.staffMembers);
        setTargetStatus(data.ticket.status === 'resolved' ? 'resolved' : 'in_progress');
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

  // Live polling every 5s for updates
  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      fetchTicketDetails(false);
    }, 5000);
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
      const res = await fetch(`/api/marketing/developer/support/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket((prev) => ({ ...prev, ...data.ticket }));
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
      const res = await fetch(`/api/marketing/developer/support/${ticketId}`, {
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
      const res = await fetch(`/api/marketing/developer/support/${ticketId}/messages`, {
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
        fetchTicketDetails(false);
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
      const res = await fetch(`/api/marketing/developer/support?id=${ticketId}`, {
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 animate-spin">
          <FiRefreshCw className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Loading Support Thread...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Connecting to creator support channel and syncing messages.</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <FiAlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{error || 'Ticket Not Found'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The requested support ticket could not be found or has been removed.
        </p>
        <Link
          href="/developer/support"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Back to All Tickets</span>
        </Link>
      </div>
    );
  }

  const statusColors = {
    open: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    in_progress: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    waiting_for_user: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    resolved: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    closed: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  const priorityColors = {
    urgent: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    high: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    medium: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    low: 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  };

  const currentStatus = (ticket.status || 'open').toLowerCase();
  const currentPriority = (ticket.priority || 'medium').toLowerCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
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

      {/* Top Header & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/developer/support"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Support Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">{ticket.ticket_number}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{ticket.subject}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wider ${
                statusColors[currentStatus] || statusColors.open
              }`}
            >
              {currentStatus}
            </span>
            <span className={`px-2 py-0.5 rounded-md border font-medium text-[10px] uppercase ${priorityColors[currentPriority] || priorityColors.medium}`}>
              {currentPriority}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Requester:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-medium">{ticket.creator_name || ticket.requester_name}</strong>
            </span>
            <span>&bull;</span>
            <span className="font-mono text-slate-600 dark:text-slate-400">{ticket.requester_email}</span>
            {ticket.creator_id && (
              <>
                <span>&bull;</span>
                <Link
                  href={`/developer/creators/${ticket.creator_id}`}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  <span>Creator Profile</span>
                  <FiExternalLink className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          {/* Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={currentStatus}
              disabled={statusLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_for_user">Waiting for User</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Assignee Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned:</span>
            <select
              value={ticket.assigned_developer_id || ''}
              onChange={(e) => handleAssignDeveloper(e.target.value || null)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {staffMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role_name || m.role})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={handleManualRefresh}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            title="Sync latest messages"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteTicket}
              className="p-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs transition-colors cursor-pointer"
              title="Delete Ticket"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation Thread & Live Stream Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col h-[600px] sm:h-[640px]">
        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
          {messages.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <FiMessageSquare className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No messages in this ticket thread yet.</p>
            </div>
          ) : (
            messages.map((m) => {
              const sType = (m.sender_type || '').toLowerCase();
              const isStaff = sType === 'developer' || sType === 'staff' || sType === 'admin';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-[11px] px-1">
                    {isStaff ? (
                      <>
                        <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                          <FiShield className="w-3 h-3" />
                          <span>{m.sender_name || m.developer_name || 'Staff Support'}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium text-[9px] uppercase border border-indigo-200 dark:border-indigo-800">
                          {m.developer_role || 'Staff'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <FiUser className="w-3 h-3 text-slate-400" />
                          <span>{m.sender_name || ticket.requester_name || 'Creator'}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[9px] uppercase border border-slate-200 dark:border-slate-700">
                          Creator
                        </span>
                      </>
                    )}
                    <span className="text-slate-400 text-[10px]">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div
                    className={`max-w-[88%] sm:max-w-xl rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                      isStaff
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
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
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
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
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 sm:p-3.5 pr-14 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 transition-all disabled:opacity-60 leading-relaxed resize-none"
              />
              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim() || !canReply}
                className="absolute right-3 bottom-3 w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                title="Send Reply"
              >
                <FiSend className={`w-4 h-4 ${sendingReply ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Status on reply:</span>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                >
                  <option value="in_progress">Keep In Progress</option>
                  <option value="waiting_for_user">Waiting for User</option>
                  <option value="resolved">Mark as Resolved</option>
                  <option value="closed">Mark as Closed</option>
                </select>
                <span className="text-slate-400 hidden sm:inline">&bull; Email notification sent to creator</span>
              </div>
              <span className="text-slate-400 hidden sm:inline">Enter to send</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

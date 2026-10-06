'use client';

import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import ChatUsersSwipeBar from 'src/component/marketing/developer/ChatUsersSwipeBar';

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
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [targetStatus, setTargetStatus] = useState('in_progress');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const [allTickets, setAllTickets] = useState([]);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  useEffect(() => {
    fetch('/api/marketing/developer/support')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.records)) {
          setAllTickets(data.records);
        }
      })
      .catch(() => {});
  }, []);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreview]);

  // Fetch ticket and message thread
  const fetchTicketDetails = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/marketing/developer/support/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setError('');
        setTicket(data.ticket);
        setMessages(data.messages || []);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  // Live polling every 5s for updates
  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      fetchTicketDetails();
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

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file (PNG, JPG, WEBP, GIF).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify('Image size exceeds 10MB limit.', 'error');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setSelectedImage(file);
          const reader = new FileReader();
          reader.onload = (event) => {
            setImagePreview(event.target?.result);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // Send developer reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const hasText = Boolean(replyMessage.trim());
    const hasImage = Boolean(selectedImage);

    if ((!hasText && !hasImage) || !ticketId || sendingReply || !canReply) return;

    setSendingReply(true);
    try {
      const formData = new FormData();
      formData.append('message', replyMessage.trim());
      formData.append('status', targetStatus);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const res = await fetch(`/api/marketing/developer/support/${ticketId}/messages`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        handleRemoveSelectedImage();
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
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Loading Support Thread...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Connecting to creator support channel and syncing messages.</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{error || 'Ticket Not Found'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The requested support ticket could not be found or has been removed.
        </p>
        <Link
          href="/developer/support"
          className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          Back to All Tickets
        </Link>
      </div>
    );
  }

  const statusColors = {
    open: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
    waiting_for_user: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    closed: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const priorityColors = {
    urgent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900',
    high: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
    medium: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    low: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800',
  };

  const currentStatus = (ticket.status || 'open').toLowerCase();
  const currentPriority = (ticket.priority || 'medium').toLowerCase();

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-3 rounded flex items-center justify-between text-xs font-medium transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Touch-Swipeable Ticket Senders Bar */}
      <ChatUsersSwipeBar
        users={allTickets.map((t) => ({
          id: t.id,
          name: t.requester_name || t.creator_name || 'Creator',
          avatar: t.creator_avatar,
          lastMessageAt: t.last_message_at || t.updated_at || t.created_at,
          active: String(t.id) === String(ticketId),
          href: `/developer/support/${t.id}`,
        }))}
        activeId={ticketId}
      />

      {/* Top Header & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/developer/support"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Support Dashboard
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">{ticket.ticket_number}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</h1>
            <span
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                statusColors[currentStatus] || statusColors.open
              }`}
            >
              {currentStatus}
            </span>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${priorityColors[currentPriority] || priorityColors.medium}`}>
              {currentPriority}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Requester: <strong className="text-slate-800 dark:text-slate-200 font-medium">{ticket.creator_name || ticket.requester_name}</strong>
            </span>
            <span>•</span>
            <span className="font-mono text-slate-600 dark:text-slate-400">{ticket.requester_email}</span>
            {ticket.creator_id && (
              <>
                <span>•</span>
                <Link
                  href={`/developer/creators/${ticket.creator_id}`}
                  className="text-slate-800 dark:text-slate-200 hover:underline font-medium"
                >
                  Creator Profile
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          {/* Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={currentStatus}
              disabled={statusLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-800 cursor-pointer"
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
            <span className="text-xs font-medium text-slate-500">Assigned:</span>
            <select
              value={ticket.assigned_developer_id || ''}
              onChange={(e) => handleAssignDeveloper(e.target.value || null)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-800 cursor-pointer"
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
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>

          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteTicket}
              className="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs font-medium transition-colors cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Conversation Thread & Live Stream Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden flex flex-col h-[600px]">
        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          {messages.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-1">
              <p className="text-xs">No messages in this ticket thread yet.</p>
            </div>
          ) : (
            messages.map((m) => {
              const sType = (m.sender_type || '').toLowerCase();
              const isStaff = sType === 'developer' || sType === 'staff' || sType === 'admin';

                  const messageImages = Array.isArray(m.images) && m.images.length > 0
                    ? m.images
                    : m.image_url
                    ? [{ image_url: m.image_url }]
                    : [];

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] px-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {m.sender_name || (isStaff ? 'Support Staff' : ticket.requester_name || 'Creator')}
                        </span>
                        <span className="text-[9px] font-medium px-1 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase">
                          {isStaff ? m.developer_role || 'Staff' : 'Creator'}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-xl rounded-xl p-3 text-xs leading-relaxed space-y-2 ${
                          isStaff
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {m.message && (
                          <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        )}

                        {/* Render attached images */}
                        {messageImages.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {messageImages.map((img, idx) => {
                              const src = typeof img === 'string' ? img : img.image_url;
                              if (!src) return null;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setPreviewModalImage(src)}
                                  className="relative group rounded-lg overflow-hidden border border-black/15 bg-black/5 dark:bg-white/5 cursor-pointer max-w-sm"
                                >
                                  <img
                                    src={src}
                                    alt="Attachment"
                                    className="w-full max-h-72 object-cover rounded-lg group-hover:scale-[1.02] transition-transform duration-200"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                                    <span>Click to enlarge</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer Form */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* Selected Image Preview Bar */}
          {selectedImage && imagePreview && (
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="w-12 h-12 object-cover rounded border border-slate-300 dark:border-slate-600 flex-shrink-0"
                />
                <div className="truncate text-left">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">{selectedImage.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{(selectedImage.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveSelectedImage}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSendReply} className="space-y-2">
            <textarea
              rows={3}
              disabled={sendingReply || !canReply}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                canReply
                  ? 'Reply to creator or paste screenshot... Press Enter to send, Shift+Enter for a new line.'
                  : 'You do not have permission to reply.'
              }
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {/* File Upload Trigger */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="developer-chat-image-input"
                />
                <label
                  htmlFor="developer-chat-image-input"
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors inline-flex items-center gap-1.5 text-xs font-medium"
                  title="Attach image (or paste image with Ctrl+V)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Attach Image</span>
                </label>

                <span className="text-slate-500">Status:</span>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                >
                  <option value="in_progress">Keep In Progress</option>
                  <option value="waiting_for_user">Waiting for User</option>
                  <option value="resolved">Mark as Resolved</option>
                  <option value="closed">Mark as Closed</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={sendingReply || (!replyMessage.trim() && !selectedImage) || !canReply}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {sendingReply ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send Reply'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox / Full-Size Image Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-3 space-y-2 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Ticket Attachment Preview</span>
              <div className="flex items-center gap-3">
                <a
                  href={previewModalImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>Open Full Size</span>
                  <span>↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalImage(null)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center p-2 max-h-[78vh] overflow-auto">
              <img
                src={previewModalImage}
                alt="Enlarged attachment"
                className="max-h-[74vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

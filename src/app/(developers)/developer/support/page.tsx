'use client';
import { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import ChatUsersSwipeBar from 'src/component/marketing/developer/ChatUsersSwipeBar';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function SupportChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTicketId = searchParams.get('id') || searchParams.get('ticketId');
  const { user } = useContext<any>(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canReply =
    permissions.includes('support') ||
    permissions.includes('supports') ||
    permissions.includes('*') ||
    Number(user?.id) === 1 ||
    String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' ||
    user?.role === 'admin' ||
    user?.role === 'developer' ||
    user?.role === 'manager';

  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<any>(null);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: string }>({ text: '', type: '' });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const messagesEndRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreview]);

  const notify = (text: string, type: string = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 4000);
  };

  const fetchTickets = useCallback(
    async (showLoading: boolean = false) => {
      try {
        if (showLoading) setLoading(true);
        const res = await fetch('/api/marketing/developer/support');
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setTickets(data.records);
          if (data.records.length > 0) {
            const sorted = [...data.records].sort((a: any, b: any) => {
              const timeA = a.last_message_at || a.updated_at || a.created_at;
              const timeB = b.last_message_at || b.updated_at || b.created_at;
              return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
            setActiveTicketId((prev: any) => {
              if (prev && data.records.some((t: any) => String(t.id) === String(prev))) {
                return prev;
              }
              return queryTicketId || sorted[0].id;
            });
          } else {
            setActiveTicketId(null);
            setActiveTicket(null);
            setMessages([]);
          }
        }
      } catch (e: any) {
        console.error('Failed to fetch support tickets:', e);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [queryTicketId]
  );

  useEffect(() => {
    fetchTickets(true);
  }, [fetchTickets]);

  const fetchTicketDetails = useCallback(async (ticketId: any, showLoading: boolean = false) => {
    if (!ticketId) return;
    try {
      if (showLoading) setLoadingMessages(true);
      const res = await fetch(`/api/marketing/developer/support/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setActiveTicket(data.ticket);
        setMessages(data.messages || []);
      }
    } catch (err: any) {
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

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets(false);
      if (activeTicketId) {
        fetchTicketDetails(activeTicketId, false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicketId, fetchTickets, fetchTicketDetails]);

  const handleImageSelect = (e: any) => {
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
    reader.onload = (event: any) => {
      setImagePreview(event.target?.result || null);
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

  const handlePaste = (e: any) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setSelectedImage(file);
          const reader = new FileReader();
          reader.onload = (event: any) => {
            setImagePreview(event.target?.result || null);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleSendReply = async (e: any) => {
    if (e) e.preventDefault();
    const text = replyMessage.trim();
    if ((!text && !selectedImage) || !activeTicketId || sendingReply || !canReply) return;
    setSendingReply(true);
    try {
      const formData = new FormData();
      formData.append('message', text);
      if (activeTicket?.status === 'resolved') {
        formData.append('status', 'in_progress');
      }
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      const res = await fetch(`/api/marketing/developer/support/${activeTicketId}/messages`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        handleRemoveSelectedImage();
        await fetchTicketDetails(activeTicketId, false);
        await fetchTickets(false);
      } else {
        notify(data.error || 'Failed to send reply', 'error');
      }
    } catch (err: any) {
      console.error('Error sending support reply:', err);
      notify('Network error sending message', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleStatus = async (newStatus: string) => {
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
    } catch (err: any) {
      console.error('Error updating status:', err);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t: any) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        String(t.id || '').includes(term) ||
        String(t.subject || '').toLowerCase().includes(term) ||
        String(t.message || '').toLowerCase().includes(term) ||
        String(t.requester_name || t.creator_name || '').toLowerCase().includes(term) ||
        String(t.creator_email || '').toLowerCase().includes(term);

      const status = String(t.status || 'open').toLowerCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'OPEN' && status === 'open') ||
        (statusFilter === 'IN_PROGRESS' && (status === 'in_progress' || status === 'pending')) ||
        (statusFilter === 'RESOLVED' && (status === 'resolved' || status === 'closed'));

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  useEffect(() => {
    if (filteredTickets.length > 0) {
      const exists = filteredTickets.some((t: any) => String(t.id) === String(activeTicketId));
      if (!exists) {
        setActiveTicketId(filteredTickets[0].id);
      }
    }
  }, [filteredTickets, activeTicketId]);

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Support Tickets &amp; Helpdesk
            </h1>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Support &amp; Comms
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Resolve creator inquiries, manage ticket lifecycles, and communicate via real-time thread.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="w-full sm:w-56">
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              Search Tickets
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => fetchTickets(true)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Refresh
            </button>
            <Link
              href="/developer/support/details"
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
            >
              Table View
            </Link>
          </div>
        </div>
      </div>

      {actionNotice.text && (
        <div
          className={`p-3 rounded text-xs font-medium border ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          {actionNotice.text}
        </div>
      )}

      <ChatUsersSwipeBar
        users={filteredTickets.map((t: any) => ({
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

      {loading && tickets.length === 0 ? (
        <LoadingScreen fullScreen={false} label="Loading support chats..." />
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No support tickets found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No tickets match your search keyword or status filter criteria.'
              : 'There are currently no active support tickets or conversations.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : activeTicket ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden flex flex-col h-[650px]">
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

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeTicket.requester_name || activeTicket.creator_name || 'Requester'} (Ticket {activeTicket.ticket_number || `#${activeTicket.id}`})
                </span>
                <span>
                  {activeTicket.created_at ? new Date(activeTicket.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                {activeTicket.subject}
              </p>
              {activeTicket.message && (
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {activeTicket.message}
                </p>
              )}
            </div>

            {loadingMessages && messages.length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <LoadingScreen fullScreen={false} size="sm" label="Loading conversation stream..." />
              </div>
            ) : (
              messages.map((m: any) => {
                const sType = String(m.sender_type || '').toLowerCase();
                const isStaff = sType === 'developer' || sType === 'admin' || sType === 'staff';
                const messageImages = Array.isArray(m.images) && m.images.length > 0
                  ? m.images
                  : m.image_url
                  ? [{ image_url: m.image_url }]
                  : [];
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isStaff ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isStaff && (
                      <div className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-[10px] shrink-0 mb-1">
                        {(m.sender_name || activeTicket.requester_name || 'C').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`${
                        messageImages.length > 0 ? 'w-full sm:w-[440px] max-w-[85%]' : 'max-w-[75%] sm:max-w-md'
                      } rounded p-3 text-xs leading-relaxed space-y-2 ${
                        isStaff
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] opacity-75">
                        <span className="font-semibold">
                          {m.sender_name || (isStaff ? 'Support Staff' : activeTicket.requester_name || 'Creator')}
                        </span>
                        <span>•</span>
                        <span>
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                      {messageImages.length > 0 && (
                        <div className="space-y-2 pt-1 w-full">
                          {messageImages.map((img: any, idx: number) => {
                            const src = typeof img === 'string' ? img : img.image_url || img.url;
                            if (!src) return null;
                            return (
                              <div
                                key={idx}
                                onClick={() => setPreviewModalImage(src)}
                                className="relative group w-full rounded border border-black/15 bg-black/5 dark:bg-white/5 cursor-pointer"
                              >
                                <img
                                  src={src}
                                  alt={img.file_name || 'Attachment'}
                                  className="w-full h-auto block rounded"
                                />
                                <div className="absolute inset-0 rounded bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium pointer-events-none">
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

          {selectedImage && imagePreview && (
            <div className="mx-3 mt-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="w-12 h-12 object-cover rounded border border-slate-300 dark:border-slate-600 shrink-0"
                />
                <div className="truncate text-left">
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-100 truncate">
                    {selectedImage.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {(selectedImage.size / 1024).toFixed(1)} KB
                  </p>
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

          <form
            onSubmit={handleSendReply}
            className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="support-hub-image-input"
            />
            <label
              htmlFor="support-hub-image-input"
              className="p-2 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-center shrink-0"
              title="Attach image (or paste image with Ctrl+V)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </label>
            <input
              type="text"
              aria-label="Reply message"
              value={replyMessage}
              onPaste={handlePaste}
              onChange={(e: any) => setReplyMessage(e.target.value)}
              disabled={sendingReply || !canReply}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-800"
            />
            <button
              type="submit"
              disabled={(!replyMessage.trim() && !selectedImage) || sendingReply || !canReply}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              {sendingReply ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      ) : null}

      {previewModalImage && (
        <div className="bg-white dark:bg-slate-900 rounded p-3 space-y-2 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-100">Attachment Preview</span>
            <div className="flex items-center gap-3">
              <a
                href={previewModalImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Open in New Tab</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="px-2 py-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
          <div className="p-2 max-h-[75vh] overflow-y-auto bg-slate-50 dark:bg-slate-950/50 rounded">
            <img src={previewModalImage} alt="Enlarged attachment" className="w-full h-auto block rounded" />
          </div>
        </div>
      )}
    </div>
  );
}

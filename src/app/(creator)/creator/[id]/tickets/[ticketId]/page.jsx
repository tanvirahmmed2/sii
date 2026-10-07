'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function CreatorSingleTicketPage() {
  const params = useParams();
  const creatorId = params?.id;
  const ticketId = params?.ticketId;

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreview]);

  const fetchTicketThread = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/marketing/creator/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setError('');
        setTicket(data.ticket);
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'Support ticket not found.');
      }
    } catch {
      setError('Network error loading conversation.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTicketThread();
  }, [fetchTicketThread]);

  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => {
      fetchTicketThread();
    }, 4000);
    return () => clearInterval(interval);
  }, [ticketId, fetchTicketThread]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchTicketThread(false);
    setRefreshing(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds 10MB limit.');
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

  const handleSendReply = async (e) => {
    e.preventDefault();
    const hasText = Boolean(replyMessage.trim());
    const hasImage = Boolean(selectedImage);

    if ((!hasText && !hasImage) || sendingReply) return;

    setSendingReply(true);
    try {
      const formData = new FormData();
      formData.append('creatorId', Number(creatorId));
      formData.append('message', replyMessage.trim());
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const res = await fetch(`/api/marketing/creator/tickets/${ticketId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        handleRemoveSelectedImage();
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
      <LoadingScreen fullScreen={false} label="Loading ticket thread..." />
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
                ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'resolved' || ticket.status === 'closed'
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
          <p className="text-slate-600 text-xs bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap">
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

        <div className="space-y-3 min-h-[160px] max-h-[460px] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-slate-400 italic text-center py-6">
              No replies yet. An agent will respond shortly.
            </p>
          ) : (
            messages.map((m) => {
              const sType = (m.sender_type || '').toLowerCase();
              const isCreator = sType === 'creator';
              const messageImages = Array.isArray(m.images) && m.images.length > 0
                ? m.images
                : m.image_url
                ? [{ image_url: m.image_url }]
                : [];

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-700">
                      {isCreator ? 'You' : m.developer_name || m.sender_name || 'Support Agent'}
                    </span>
                    <span>&middot;</span>
                    <span className="font-mono">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl max-w-sm sm:max-w-md text-xs leading-normal space-y-2 ${
                      isCreator
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
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
                              className="relative group rounded-lg overflow-hidden border border-black/15 bg-black/5 cursor-pointer max-w-full"
                            >
                              <img
                                src={src}
                                alt="Attachment"
                                className="w-full max-h-64 object-cover rounded-lg group-hover:scale-[1.02] transition-transform duration-200"
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

        {/* Selected Image Preview Bar */}
        {selectedImage && imagePreview && (
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={imagePreview}
                alt="Selected"
                className="w-12 h-12 object-cover rounded border border-slate-300 flex-shrink-0"
              />
              <div className="truncate text-left">
                <p className="text-[11px] font-semibold text-slate-800 truncate">{selectedImage.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{(selectedImage.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveSelectedImage}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-slate-200/60 cursor-pointer transition-colors"
              title="Remove image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Reply Form */}
        <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 flex items-center gap-2">
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="creator-chat-image-input"
          />
          <label
            htmlFor="creator-chat-image-input"
            className="p-2 rounded border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-center flex-shrink-0"
            title="Attach image (or paste image with Ctrl+V)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </label>

          <input
            type="text"
            placeholder={selectedImage ? "Add an optional message..." : "Type your message or paste an image..."}
            value={replyMessage}
            onPaste={handlePaste}
            onChange={(e) => setReplyMessage(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          />

          <button
            type="submit"
            disabled={sendingReply || (!replyMessage.trim() && !selectedImage)}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
              'Send'
            )}
          </button>
        </form>
      </div>

      {/* Lightbox / Full-Size Image Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-800">Support Attachment Preview</span>
              <div className="flex items-center gap-3">
                <a
                  href={previewModalImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>Open Full Size</span>
                  <span>↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalImage(null)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
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


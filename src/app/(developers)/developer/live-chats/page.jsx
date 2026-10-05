'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ChatUsersSwipeBar from 'src/component/marketing/developer/ChatUsersSwipeBar';

export default function AdminLiveChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryChatId = searchParams.get('chatId');

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
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

  // 1. Fetch chat sessions list
  const fetchChats = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/marketing/developer/live_chats');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setChats(data.records);
        if (data.currentUser) setCurrentUser(data.currentUser);

        // Sort latest sender first to pick active chat
        if (data.records.length > 0) {
          const sorted = [...data.records].sort((a, b) => {
            const timeA = a.last_message_at || a.updated_at || a.created_at;
            const timeB = b.last_message_at || b.updated_at || b.created_at;
            return new Date(timeB) - new Date(timeA);
          });
          setActiveChatId((prev) => {
            if (prev && data.records.some((c) => String(c.id) === String(prev))) return prev;
            return queryChatId || sorted[0].id;
          });
        } else {
          setActiveChatId(null);
          setActiveChat(null);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch live chats:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [queryChatId]);

  useEffect(() => {
    fetchChats(true);
  }, [fetchChats]);

  // 2. Fetch specific active chat and its message stream
  const fetchActiveChatDetails = useCallback(async (chatId, showLoading = false) => {
    if (!chatId) return;
    try {
      if (showLoading) setLoadingMessages(true);
      const res = await fetch(`/api/marketing/developer/live_chats?chatId=${chatId}`);
      const data = await res.json();
      if (data.success && data.chat) {
        setActiveChat(data.chat);
        setMessages(data.messages || []);
        if (data.currentUser) setCurrentUser(data.currentUser);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeChatId) {
      fetchActiveChatDetails(activeChatId, true);
    }
  }, [activeChatId, fetchActiveChatDetails]);

  // Silent polling every 3 seconds for active chat messages and conversation updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChats(false);
      if (activeChatId) {
        fetchActiveChatDetails(activeChatId, false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeChatId, fetchChats, fetchActiveChatDetails]);

  // Handle Send Reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const text = replyMessage.trim();
    if (!text || !activeChatId || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyMessage('');
        if (data.messageRecord) {
          setMessages((prev) => [...prev, data.messageRecord]);
        }
        await fetchChats(false);
      } else {
        notify(data.error || 'Failed to send reply', 'error');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      notify('Network error sending message', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Status toggle
  const handleToggleStatus = async (newStatus) => {
    if (!activeChatId) return;
    try {
      const res = await fetch('/api/marketing/developer/live_chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify(`Chat status updated to ${newStatus}`);
        await fetchChats(false);
        await fetchActiveChatDetails(activeChatId, false);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Touch-Swipeable Visitors Bar */}
      <ChatUsersSwipeBar
        users={chats.map((c) => ({
          id: c.id,
          name: c.visitor_name || 'Visitor',
          avatar: null,
          lastMessageAt: c.last_message_at || c.updated_at || c.created_at,
          unreadCount: c.unread_count || 0,
          active: String(c.id) === String(activeChatId),
          onClick: () => setActiveChatId(c.id),
        }))}
        activeId={activeChatId}
      />

      {/* Main Content Area */}
      {loading && chats.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center text-slate-400">
          <span className="text-xs font-normal">Loading live chats...</span>
        </div>
      ) : chats.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No chats are available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            There are currently no active visitor chat sessions.
          </p>
          <Link
            href="/developer/live-chats/details"
            className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Workspace Details
          </Link>
        </div>
      ) : activeChat ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden flex flex-col h-[650px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
                {activeChat.visitor_name?.charAt(0)?.toUpperCase() || 'V'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {activeChat.visitor_name}
                  </h2>
                  <span
                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                      String(activeChat.status).toUpperCase() === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : String(activeChat.status).toUpperCase() === 'OPEN'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {activeChat.status || 'OPEN'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeChat.visitor_email || 'Guest visitor'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {String(activeChat.status).toUpperCase() !== 'RESOLVED' ? (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('RESOLVED')}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  Resolve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('ACTIVE')}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  Re-open
                </button>
              )}

              <Link
                href="/developer/live-chats/details"
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                Details
              </Link>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
            {loadingMessages && messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <p>No messages in this chat yet.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isVisitor = m.sender_type === 'VISITOR';
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isVisitor ? 'justify-start' : 'justify-end'}`}
                  >
                    {isVisitor && (
                      <div className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-[10px] shrink-0 mb-1">
                        {m.sender_name?.charAt(0)?.toUpperCase() || 'V'}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] sm:max-w-md rounded p-3 text-xs leading-relaxed ${
                        isVisitor
                          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                          : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                        <span className="font-semibold">{m.sender_name || (isVisitor ? 'Visitor' : 'Support')}</span>
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
              placeholder={`Reply to ${activeChat.visitor_name}...`}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              disabled={sendingReply}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
            <button
              type="submit"
              disabled={!replyMessage.trim() || sendingReply}
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

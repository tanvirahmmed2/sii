'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BiMessageRoundedDots,
  BiX,
  BiMinus,
  BiSend,
  BiSupport,
  BiPowerOff,
  BiLoaderAlt,
  BiTime,
} from 'react-icons/bi';
import { SITE_NAME, LIVE_CHAT_TOKEN } from 'src/lib/database/secret';

const COOKIE_NAME = LIVE_CHAT_TOKEN || 'hiesci-live';
const COOKIE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cookie Helpers
function getLiveCookie() {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const [name, ...valParts] = c.trim().split('=');
      if (name === COOKIE_NAME) {
        const raw = valParts.join('=');
        if (!raw) return null;
        let parsed = null;
        try {
          parsed = JSON.parse(decodeURIComponent(raw));
        } catch (_) {
          try {
            const decoded = atob(raw);
            parsed = JSON.parse(decoded);
          } catch (_) { }
        }
        if (parsed) {
          // Check 24-hour window
          if (parsed.createdAt && Date.now() - parsed.createdAt > COOKIE_EXPIRY_MS) {
            clearLiveCookie();
            return null;
          }
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            clearLiveCookie();
            return null;
          }
          return parsed;
        }
      }
    }
  } catch (_) { }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem('hiesci_live_chat_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.createdAt && Date.now() - parsed.createdAt <= COOKIE_EXPIRY_MS) {
        return parsed;
      } else {
        localStorage.removeItem('hiesci_live_chat_session');
      }
    }
  } catch (_) { }

  return null;
}

function setLiveCookie(cookieData) {
  if (typeof document === 'undefined') return;
  try {
    const now = Date.now();
    const expiresAt = new Date(now + COOKIE_EXPIRY_MS).toUTCString();
    const encoded = encodeURIComponent(JSON.stringify(cookieData));
    document.cookie = `${COOKIE_NAME}=${encoded}; expires=${expiresAt}; max-age=86400; path=/; SameSite=Lax`;
    localStorage.setItem('hiesci_live_chat_session', JSON.stringify(cookieData));
  } catch (_) { }
}

function clearLiveCookie() {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/; SameSite=Lax`;
    localStorage.removeItem('hiesci_live_chat_session');
  } catch (_) { }
}

export default function LiveChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [chatSession, setChatSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionRemainingHours, setSessionRemainingHours] = useState(24);

  // Dragging state (null = default primary bottom-left position)
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const launcherRef = useRef(null);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
    isDragging: false,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Load saved icon drag position from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hiesci_live_chat_icon_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const btnSize = 56;
          const margin = 12;
          const maxX = window.innerWidth - btnSize - margin;
          const maxY = window.innerHeight - btnSize - margin;
          setPosition({
            x: Math.min(Math.max(parsed.x, margin), maxX),
            y: Math.min(Math.max(parsed.y, margin), maxY),
          });
        }
      }
    } catch (_) {}
  }, []);

  // Window resize handler: clamp icon within viewport if dragged and update localStorage
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const btnSize = 56;
        const margin = 16;
        const maxX = window.innerWidth - btnSize - margin;
        const maxY = window.innerHeight - btnSize - margin;
        const clamped = {
          x: Math.min(Math.max(prev.x, margin), Math.max(margin, maxX)),
          y: Math.min(Math.max(prev.y, margin), Math.max(margin, maxY)),
        };
        try {
          localStorage.setItem('hiesci_live_chat_icon_pos', JSON.stringify(clamped));
        } catch (_) {}
        return clamped;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer drag start
  const handlePointerDown = (clientX, clientY) => {
    if (!launcherRef.current) return;
    const rect = launcherRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top,
      hasMoved: false,
      isDragging: true,
      currentPos: null,
    };
    setIsDragging(true);
  };

  // Pointer drag move
  const handlePointerMove = useCallback((clientX, clientY) => {
    if (!dragRef.current.isDragging) return;
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    if (!dragRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 5) {
      dragRef.current.hasMoved = true;
    }

    if (dragRef.current.hasMoved) {
      const btnSize = 56;
      const margin = 12;
      const newX = dragRef.current.initialX + deltaX;
      const newY = dragRef.current.initialY + deltaY;

      const maxX = window.innerWidth - btnSize - margin;
      const maxY = window.innerHeight - btnSize - margin;

      const clampedPos = {
        x: Math.min(Math.max(newX, margin), maxX),
        y: Math.min(Math.max(newY, margin), maxY),
      };

      dragRef.current.currentPos = clampedPos;
      setPosition(clampedPos);
    }
  }, []);

  // Pointer drag end
  const handlePointerUp = useCallback(() => {
    if (!dragRef.current.isDragging) return;
    const moved = dragRef.current.hasMoved;
    const finalPos = dragRef.current.currentPos;
    dragRef.current.isDragging = false;
    setIsDragging(false);

    // If dragged and moved, persist position to localStorage
    if (moved && finalPos) {
      try {
        localStorage.setItem('hiesci_live_chat_icon_pos', JSON.stringify(finalPos));
      } catch (_) {}
    }

    // If user clicked without dragging, toggle chat popup open/closed
    if (!moved) {
      setIsOpen((prev) => !prev);
    }
  }, []);

  // Attach global mouse and touch events while dragging
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => {
      handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handlePointerUp();
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Initial load: check 24-hour cookie session
  useEffect(() => {
    let isMounted = true;
    const cookie = getLiveCookie();

    const url = cookie?.chatId || cookie?.sessionId
      ? `/api/marketing/live_chats?chatId=${cookie.chatId || ''}&sessionId=${cookie.sessionId || ''}`
      : '/api/marketing/live_chats';

    fetch(url)
      .then((res) => (res.ok ? res.json() : { success: false }))
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.chat && data.chat.status !== 'CLOSED') {
          setChatSession(data.chat);
          setMessages(data.messages || []);
          lastMessageCountRef.current = (data.messages || []).length;

          // Calculate remaining time
          const createdTime = new Date(data.chat.created_at).getTime() || Date.now();
          const elapsed = Date.now() - createdTime;
          const remainingHrs = Math.max(1, Math.round((COOKIE_EXPIRY_MS - elapsed) / (1000 * 60 * 60)));
          setSessionRemainingHours(remainingHrs);

          // Refresh client cookie to stay in sync
          setLiveCookie({
            sessionId: data.chat.session_id,
            chatId: data.chat.id,
            visitorName: data.chat.visitor_name,
            visitorEmail: data.chat.visitor_email,
            createdAt: createdTime,
            expiresAt: createdTime + COOKIE_EXPIRY_MS,
          });
        } else {
          clearLiveCookie();
          setChatSession(null);
          setMessages([]);
        }
      })
      .catch((err) => {
        console.error('Live chat session verification error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Live polling for staff replies (polls when session is active)
  useEffect(() => {
    if (!chatSession?.id) return;

    const intervalTime = isOpen ? 3000 : 5000;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/marketing/live_chats?chatId=${chatSession.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.chat) {
          if (data.chat.status === 'CLOSED') {
            setChatSession(null);
            clearLiveCookie();
            return;
          }

          if (Array.isArray(data.messages)) {
            const newCount = data.messages.length;
            const prevCount = lastMessageCountRef.current;

            if (newCount > prevCount && !isOpen) {
              const diff = newCount - prevCount;
              setUnreadCount((prev) => prev + diff);
            }

            lastMessageCountRef.current = newCount;
            setMessages(data.messages);
            setChatSession(data.chat);
          }
        }
      } catch (_) { }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [chatSession, isOpen]);

  // Start new 24-hour live chat session
  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    setLoading(true);

    const device = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      screen:
        typeof window !== 'undefined'
          ? `${window.screen.width}x${window.screen.height}`
          : 'Unknown',
      os:
        typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')
          ? 'Windows'
          : typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
          ? 'macOS'
          : typeof navigator !== 'undefined' && navigator.userAgent.includes('Android')
          ? 'Android'
          : typeof navigator !== 'undefined' && navigator.userAgent.includes('iPhone')
          ? 'iOS'
          : 'Linux/Other',
      browser:
        typeof navigator !== 'undefined' && navigator.userAgent.includes('Chrome')
          ? 'Chrome'
          : typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox')
          ? 'Firefox'
          : typeof navigator !== 'undefined' && navigator.userAgent.includes('Safari')
          ? 'Safari'
          : 'Browser',
    };

    try {
      const res = await fetch('/api/marketing/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_chat',
          visitor_name: visitorName.trim(),
          visitor_email: visitorEmail.trim() || null,
          device,
        }),
      });
      const data = res.ok ? await res.json() : { success: false, error: 'Request failed' };

      if (data.success && data.chat) {
        setChatSession(data.chat);
        setMessages(data.messages || []);
        lastMessageCountRef.current = (data.messages || []).length;
        setSessionRemainingHours(24);

        // Store 24-hour cookie
        if (data.cookieData) {
          setLiveCookie(data.cookieData);
        } else {
          setLiveCookie({
            sessionId: data.chat.session_id,
            chatId: data.chat.id,
            visitorName: data.chat.visitor_name,
            visitorEmail: data.chat.visitor_email,
            createdAt: Date.now(),
            expiresAt: Date.now() + COOKIE_EXPIRY_MS,
          });
        }
      } else {
        alert(data.error || 'Failed to start chat session');
      }
    } catch (err) {
      console.error('Failed to initiate live chat:', err);
    } finally {
      setLoading(false);
    }
  };

  // Visitor sends message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !chatSession || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistic visitor message
    const tempMsg = {
      id: 'temp_' + Date.now(),
      chat_id: chatSession.id,
      sender_type: 'VISITOR',
      sender_name: chatSession.visitor_name,
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    lastMessageCountRef.current += 1;

    try {
      const res = await fetch('/api/marketing/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: chatSession.id,
          sender_name: chatSession.visitor_name,
          message: text,
        }),
      });
      const data = res.ok ? await res.json() : { success: false };
      if (data.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? data.message : m))
        );
      }
    } catch (err) {
      console.error('Failed to send live chat message:', err);
    } finally {
      setSending(false);
    }
  };

  // End chat session & clear 24h cookie
  const handleEndChat = async () => {
    if (!confirm('Are you sure you want to end this live chat session? Your 24-hour cookie and session history will be cleared.')) return;
    try {
      await fetch('/api/marketing/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_chat',
          chat_id: chatSession?.id,
        }),
      });
    } catch (_) { }
    clearLiveCookie();
    setChatSession(null);
    setMessages([]);
    setVisitorName('');
    setVisitorEmail('');
    setUnreadCount(0);
    lastMessageCountRef.current = 0;
  };

  // Compute smart positioning for the popup window relative to icon
  const getPopupStyle = () => {
    if (typeof window === 'undefined') return {};
    if (!position) {
      // Primary default placement: bottom-left
      return {
        position: 'fixed',
        left: '32px',
        bottom: '96px',
        width: 'min(420px, calc(100vw - 32px))',
        height: 'min(540px, 82vh)',
        zIndex: 60,
      };
    }

    const popupWidth = Math.min(420, window.innerWidth - 32);
    const popupHeight = Math.min(540, window.innerHeight * 0.82);
    const btnSize = 56;
    const margin = 16;

    // Horizontal placement
    let left = position.x;
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }
    if (left < margin) left = margin;

    // Vertical placement: open above button if enough room, otherwise below
    let top = position.y - popupHeight - 12;
    if (top < margin) {
      top = position.y + btnSize + 12;
    }
    if (top + popupHeight > window.innerHeight - margin) {
      top = window.innerHeight - popupHeight - margin;
    }
    if (top < margin) top = margin;

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${popupWidth}px`,
      height: `${popupHeight}px`,
      zIndex: 60,
    };
  };

  return (
    <>
      {/* Expanded Chat Popup Window */}
      {isOpen && (
        <div
          style={getPopupStyle()}
          className="bg-white border border-slate-200 shadow-2xl rounded-3xl flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 font-sans"
        >
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3.5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  <BiSupport className="text-lg" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">{SITE_NAME || 'Platform'} Support Desk</h3>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Engineering & Support Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {chatSession && (
                <button
                  type="button"
                  onClick={handleEndChat}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title="End chat session (clears 24h cookie)"
                  aria-label="End chat session"
                >
                  <BiPowerOff className="text-base" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Minimize chat"
                aria-label="Minimize chat"
              >
                <BiMinus className="text-lg" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Close chat"
                aria-label="Close chat"
              >
                <BiX className="text-xl" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {!chatSession ? (
            /* STEP 1: Visitor Start Chat Form */
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-slate-50">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-2 border border-indigo-100">
                  <BiMessageRoundedDots />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-base font-bold text-slate-900">How can we help you?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Connect directly with a dedicated developer or support specialist. A 24-hour cookie keeps your session saved across visits.
                  </p>
                </div>

                <form onSubmit={handleStartChat} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 transition-colors shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={visitorEmail}
                      onChange={(e) => setVisitorEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 transition-colors shadow-2xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !visitorName.trim()}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-4"
                  >
                    {loading ? (
                      <>
                        <BiLoaderAlt className="animate-spin text-sm" />
                        <span>Connecting to Support...</span>
                      </>
                    ) : (
                      <span>Start Live Chat →</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-4 border-t border-slate-200/60">
                <span>🔒 24-hour persistent cookie session will be established</span>
              </div>
            </div>
          ) : (
            /* STEP 2: Live Conversation Stream */
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
              {/* Session Status Banner */}
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between shrink-0">
                <span className="truncate">
                  Chatting as <strong className="text-slate-800">{chatSession.visitor_name}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  <BiTime className="text-xs" />
                  <span>24h Active ({sessionRemainingHours}h left)</span>
                </span>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                {messages.map((msg, idx) => {
                  const isVisitor = msg.sender_type === 'VISITOR';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isVisitor ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 mb-1 px-1">
                        <span className="text-[10px] font-semibold text-slate-500">
                          {isVisitor ? 'You' : 'Support Specialist'}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isVisitor
                            ? 'bg-slate-900 text-white rounded-br-xs'
                            : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Type a message to support..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition-all cursor-pointer shadow-xs"
                  title="Send message"
                  aria-label="Send message"
                >
                  {sending ? (
                    <BiLoaderAlt className="animate-spin text-base" />
                  ) : (
                    <BiSend className="text-base" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Floating Draggable Launcher Button */}
      <div
        ref={launcherRef}
        style={
          position
            ? {
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 70,
                touchAction: 'none',
              }
            : {
                position: 'fixed',
                left: '32px',
                bottom: '24px',
                zIndex: 70,
                touchAction: 'none',
              }
        }
        className={`font-sans select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            handlePointerDown(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) {
              handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-150 select-none ${
            isDragging ? 'cursor-grabbing scale-105 shadow-indigo-500/30' : 'cursor-grab'
          }`}
          aria-label="Live chat support (click to chat or drag anywhere)"
          title={isDragging ? 'Dragging...' : 'Click to chat, or drag anywhere on screen'}
        >
          {isOpen ? (
            <BiX className="text-2xl pointer-events-none" />
          ) : (
            <>
              <BiMessageRoundedDots className="text-2xl pointer-events-none" />

              {/* Online Pulse Indicator */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
              </span>

              {/* Unread Message Count Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-2 -left-2 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce pointer-events-none">
                  {unreadCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </>
  );
}

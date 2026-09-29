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
} from 'react-icons/bi';
import { SITE_NAME } from '@/lib/db/secret';

export default function LiveChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [chatSession, setChatSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Check for existing 24-hour cookie session on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/live_chats')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.chat) {
          setChatSession(data.chat);
          setMessages(data.messages || []);
          if (data.device) setDeviceInfo(data.device);
        } else {
          setChatSession(null);
          setMessages([]);
        }
      })
      .catch((err) => {
        console.error('Error checking live chat session:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Live polling: poll for new messages every 3.5s when chat popup is open
  useEffect(() => {
    if (!isOpen || !chatSession) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/live_chats?chatId=${chatSession.id}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
          if (data.chat) {
            setChatSession(data.chat);
          }
        }
      } catch (_) {
        // Suppress polling errors
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, chatSession]);

  // Start new chat session
  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    setLoading(true);

    // Collect device data
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
      const res = await fetch('/api/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_chat',
          visitor_name: visitorName.trim(),
          visitor_email: visitorEmail.trim() || null,
          device,
        }),
      });
      const data = await res.json();

      if (data.success && data.chat) {
        setChatSession(data.chat);
        setMessages(data.messages || []);
        setDeviceInfo(data.device || device);
      } else {
        alert(data.error || 'Failed to start chat session');
      }
    } catch (err) {
      console.error('Failed to initiate live chat:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send message from guest
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !chatSession || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistic message
    const tempMsg = {
      id: 'temp_' + Date.now(),
      chat_id: chatSession.id,
      sender_type: 'VISITOR',
      sender_name: chatSession.visitor_name,
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: chatSession.id,
          sender_name: chatSession.visitor_name,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        // Replace optimistic message with actual DB record
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

  // End chat session and clear 24h cookie
  const handleEndChat = async () => {
    if (!confirm('Are you sure you want to end this live chat session? Your 24-hour cookie will be cleared.')) return;
    try {
      await fetch('/api/live_chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_chat',
          chat_id: chatSession?.id,
        }),
      });
    } catch (_) {}
    setChatSession(null);
    setMessages([]);
    setVisitorName('');
    setVisitorEmail('');
  };

  return (
    <div className="fixed bottom-6 left-8 z-50 font-sans">
      {/* Expanded Chat Popup Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] h-[520px] max-h-[82vh] bg-white border border-slate-200 shadow-2xl rounded-3xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3.5 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  <BiSupport className="text-lg" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">{SITE_NAME} Help Desk</h3>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Support Team Online
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
            /* STEP 1: Start Chat Form */
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-slate-50">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-2 border border-indigo-100">
                  <BiMessageRoundedDots />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-base font-bold text-slate-900">How can we help you?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Chat directly with our support team. Your session and device data will be saved in cookies for 24 hours.
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
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
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
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800 transition-colors"
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
                        <span>Connecting with Support...</span>
                      </>
                    ) : (
                      <span>Start Live Chat →</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-200/60">
                🔒 24-hour persistent cookie session active
              </div>
            </div>
          ) : (
            /* STEP 2: Live Conversation Stream */
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
              {/* Session Banner */}
              <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                <span>
                  Chatting as <strong className="text-slate-700">{chatSession.visitor_name}</strong>
                </span>
                <span className="font-mono text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  Active (24h)
                </span>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.map((msg, idx) => {
                  const isVisitor = msg.sender_type === 'VISITOR';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isVisitor ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] font-semibold text-slate-500">
                          {isVisitor ? 'You' : 'Support'}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
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
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type a message to support..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
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

      {/* Floating Launcher Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-2xl hover:scale-105 transition-all duration-200 cursor-pointer group"
          aria-label="Open live chat support"
        >
          {isOpen ? (
            <BiX className="text-2xl" />
          ) : (
            <>
              <BiMessageRoundedDots className="text-2xl" />
              {/* Online Ping Indicator */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

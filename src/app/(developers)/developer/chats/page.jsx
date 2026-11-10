'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import {
  FiMessageSquare,
  FiUserPlus,
  FiUsers,
  FiSearch,
  FiSend,
  FiImage,
  FiX,
  FiShield,
  FiArrowLeft,
  FiRefreshCw
} from 'react-icons/fi';

export default function DeveloperChatsPage() {
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isOwner = Number(user?.id) === 1 || String(user?.email).toLowerCase() === 'tanvir004006@gmail.com' || permissions.includes('*');
  const isAuthorized = isOwner || permissions.includes('chats') || permissions.includes('chat');

  const [chats, setChats] = useState([]);
  const [availableDevs, setAvailableDevs] = useState([]);
  const [currentDevId, setCurrentDevId] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [textInput, setTextInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [sending, setSending] = useState(false);

  const [showDirectPanel, setShowDirectPanel] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedGroupDevIds, setSelectedGroupDevIds] = useState([]);
  const [filterSearch, setFilterSearch] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      setLoadingChats(true);
      const res = await fetch('/api/marketing/developer/chats');
      const data = await res.json();
      if (data.success) {
        setChats(data.chats || []);
        setAvailableDevs(data.availableDevelopers || []);
        setCurrentDevId(data.currentDeveloperId);

        if (!selectedChat && data.chats && data.chats.length > 0) {
          setSelectedChat(data.chats[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/marketing/developer/chats/${chatId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchChats();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedChat) return;
    if (!textInput.trim() && !imageUrlInput.trim()) return;

    try {
      setSending(true);
      const payload = {
        message: textInput.trim(),
        images: imageUrlInput.trim()
          ? [{ url: imageUrlInput.trim(), fileName: 'attachment.jpg' }]
          : [],
      };

      const res = await fetch(`/api/marketing/developer/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setTextInput('');
        setImageUrlInput('');
        setShowImageInput(false);
        setTimeout(scrollToBottom, 100);
        fetchChats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleStartDirectChat = async (recipientId) => {
    try {
      const res = await fetch('/api/marketing/developer/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DIRECT', recipient_developer_id: recipientId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDirectPanel(false);
        await fetchChats();
        const found = chats.find((c) => c.id === data.chatId);
        if (found) setSelectedChat(found);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroupChat = async (e) => {
    e.preventDefault();
    if (!groupTitle.trim()) return;
    try {
      const res = await fetch('/api/marketing/developer/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GROUP',
          title: groupTitle.trim(),
          participant_developer_ids: selectedGroupDevIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowGroupPanel(false);
        setGroupTitle('');
        setSelectedGroupDevIds([]);
        await fetchChats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getChatDisplayName = (chat) => {
    if (chat.type === 'GROUP') {
      return chat.title || 'Group Channel';
    }
    const other = (chat.participants || []).find((p) => p.id !== currentDevId);
    return other ? other.name : 'Direct Message';
  };

  const getChatSubtitle = (chat) => {
    if (chat.type === 'GROUP') {
      return `${(chat.participants || []).length} members`;
    }
    const other = (chat.participants || []).find((p) => p.id !== currentDevId);
    return other ? other.role_name || other.role || 'Developer' : '';
  };

  const filteredChats = chats.filter((c) => {
    if (!filterSearch.trim()) return true;
    const name = getChatDisplayName(c).toLowerCase();
    return name.includes(filterSearch.toLowerCase().trim());
  });

  if (!isAuthorized && user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xl">
            <FiShield />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">You require internal chat permissions to access team channels.</p>
          <Link
            href="/developer/overview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
          >
            <FiArrowLeft /> Return to Overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Engineering Internal Chat
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Workspace &amp; Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time developer team channels, direct messaging, and incident discussions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowGroupPanel(false);
              setShowDirectPanel(!showDirectPanel);
            }}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <FiUserPlus />
            <span>{showDirectPanel ? 'Close Direct' : 'Direct Message'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDirectPanel(false);
              setShowGroupPanel(!showGroupPanel);
            }}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <FiUsers />
            <span>{showGroupPanel ? 'Close Group' : 'New Channel'}</span>
          </button>
        </div>
      </div>

      {showDirectPanel && (
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs">Start Direct Message</h3>
              <p className="text-[11px] text-slate-500">Select any developer on the platform team</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDirectPanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded border border-slate-200 dark:border-slate-800">
            {availableDevs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No other team developers found.</div>
            ) : (
              availableDevs.map((dev) => (
                <div
                  key={dev.id}
                  className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{dev.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{dev.email} &bull; {dev.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartDirectChat(dev.id)}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                  >
                    Chat
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showGroupPanel && (
        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs">Create Group Channel</h3>
              <p className="text-[11px] text-slate-500">Group discussions for squads, features, or triage</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGroupPanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleCreateGroupChat} className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Channel Title *
              </label>
              <input
                type="text"
                required
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Add Channel Members ({selectedGroupDevIds.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto rounded border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {availableDevs.map((dev) => {
                  const isSelected = selectedGroupDevIds.includes(dev.id);
                  return (
                    <label
                      key={dev.id}
                      className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{dev.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{dev.role}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroupDevIds([...selectedGroupDevIds, dev.id]);
                          } else {
                            setSelectedGroupDevIds(selectedGroupDevIds.filter((id) => id !== dev.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowGroupPanel(false)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!groupTitle.trim()}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[620px]">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">
                <FiSearch />
              </span>
              <input
                type="text"
                aria-label="Filter channels"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loadingChats ? (
              <div className="p-8 text-center">
                <LoadingScreen fullScreen={false} size="sm" label="Loading channels..." />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No conversations found.</div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                const displayName = getChatDisplayName(chat);
                const sub = getChatSubtitle(chat);

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 border-l-4 border-l-slate-900 dark:border-l-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {displayName}
                      </span>
                      {chat.last_message_at && (
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {chat.last_message || sub || 'No messages yet'}
                      </p>
                      {chat.type === 'GROUP' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 uppercase">
                          Group
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded flex flex-col overflow-hidden">
          {selectedChat ? (
            <>
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold">
                    {selectedChat.type === 'GROUP' ? <FiUsers /> : <FiMessageSquare />}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white text-xs">
                      {getChatDisplayName(selectedChat)}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {getChatSubtitle(selectedChat)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fetchMessages(selectedChat.id)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
                  title="Refresh conversation"
                >
                  <FiRefreshCw />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="py-16 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading messages..." />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    Start the conversation by sending a message below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.is_system) {
                      return (
                        <div key={msg.id} className="text-center py-1">
                          <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded font-mono">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    const isMe = Number(msg.sender_id) === Number(currentDevId);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400 font-mono">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {isMe ? 'You' : msg.sender_name}
                          </span>
                          <span>&bull;</span>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[75%] rounded p-2.5 text-xs ${
                            isMe
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                          {Array.isArray(msg.images) && msg.images.length > 0 && (
                            <div className="pt-2 flex flex-wrap gap-2">
                              {msg.images.map((img, i) => (
                                <a
                                  key={i}
                                  href={img.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={img.image_url}
                                    alt={img.file_name || 'Attachment'}
                                    className="max-h-40 rounded object-cover border border-white/20"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {showImageInput && (
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40">
                  <input
                    type="text"
                    aria-label="Image URL attachment"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrlInput('');
                      setShowImageInput(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                  >
                    <FiX />
                  </button>
                </div>
              )}

              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageInput(!showImageInput)}
                    className="p-2 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    title="Attach Image URL"
                  >
                    <FiImage />
                  </button>
                  <input
                    type="text"
                    aria-label="Type your message"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!textInput.trim() && !imageUrlInput.trim())}
                    className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                  >
                    <FiSend className="text-xs" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Select a conversation</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Pick a channel from the left sidebar or start a new direct message with any developer on the team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

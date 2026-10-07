'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function DeveloperChatsPage() {
  const { user } = useContext(Context);

  const [chats, setChats] = useState([]);
  const [availableDevs, setAvailableDevs] = useState([]);
  const [currentDevId, setCurrentDevId] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New message composer
  const [textInput, setTextInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [sending, setSending] = useState(false);

  // Modals
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
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

        // Auto-select first chat if none selected
        if (!selectedChat && data.chats && data.chats.length > 0) {
          setSelectedChat(data.chats[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
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
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

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
      console.error('Error sending message:', err);
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
        setShowDirectModal(false);
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
        setShowGroupModal(false);
        setGroupTitle('');
        setSelectedGroupDevIds([]);
        await fetchChats();
        const found = chats.find((c) => c.id === data.chatId);
        if (found) setSelectedChat(found);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getChatDisplayName = (chat) => {
    if (chat.type === 'GROUP') {
      return chat.title || 'Untitled Group';
    }
    const other = (chat.participants || []).find((p) => p.id !== currentDevId);
    return other ? other.name : 'Direct Chat';
  };

  const getChatSubtitle = (chat) => {
    if (chat.type === 'GROUP') {
      return `${(chat.participants || []).length} members`;
    }
    const other = (chat.participants || []).find((p) => p.id !== currentDevId);
    return other ? other.role : 'Developer';
  };

  const filteredChats = chats.filter((c) => {
    const name = getChatDisplayName(c).toLowerCase();
    const query = filterSearch.toLowerCase();
    return name.includes(query) || (c.last_message || '').toLowerCase().includes(query);
  });

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Internal Developer Messenger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time team communication, private 1-on-1 chats, group channels, and image sharing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDirectModal(true)}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
          >
            Direct Message
          </button>
          <button
            onClick={() => setShowGroupModal(true)}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            New Group
          </button>
        </div>
      </div>

      {/* Main Chat Interface Grid */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px] max-h-[720px]">
        {/* Left Column: Chat List */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          <div className="p-3 border-b border-slate-200">
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingChats ? (
              <div className="p-8">
                <LoadingScreen fullScreen={false} size="sm" label="Loading conversations..." />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active conversations found.
              </div>
            ) : (
              filteredChats.map((c) => {
                const isActive = selectedChat?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChat(c)}
                    className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                      isActive ? 'bg-white border-l-2 border-slate-900' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {getChatDisplayName(c)}
                        </span>
                        {c.last_message_at && (
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {c.last_message || <span className="italic text-slate-400">No messages yet</span>}
                      </p>
                      <span className="inline-block text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                        {getChatSubtitle(c)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Thread */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {selectedChat ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <div>
                  <h3 className="font-semibold text-slate-900 text-xs">
                    {getChatDisplayName(selectedChat)}
                  </h3>
                  <div className="text-[10px] text-slate-500">
                    {selectedChat.type === 'GROUP' ? (
                      <span>{(selectedChat.participants || []).map((p) => p.name).join(', ')}</span>
                    ) : (
                      <span>Direct Channel</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => fetchMessages(selectedChat.id)}
                  className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {loadingMessages ? (
                  <div className="py-8">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading message thread..." />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-1">
                    <p className="text-xs text-slate-500 font-medium">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === currentDevId;
                    if (m.is_system) {
                      return (
                        <div key={m.id} className="text-center my-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium inline-block">
                            {m.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400 px-1">
                          <span className="font-medium text-slate-700">{m.sender_name}</span>
                          <span className="text-[9px] uppercase px-1 py-0.2 bg-slate-100 rounded text-slate-600">
                            {m.sender_role}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-md p-3 rounded text-xs leading-relaxed ${
                            isMe
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          {m.message && <p className="whitespace-pre-wrap">{m.message}</p>}

                          {/* Images attached */}
                          {m.images && m.images.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {m.images.map((img) => (
                                <a
                                  key={img.id || img.image_url}
                                  href={img.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded overflow-hidden border border-black/10 hover:opacity-95 transition-opacity"
                                >
                                  <img
                                    src={img.image_url}
                                    alt={img.file_name || 'Attachment'}
                                    className="max-h-56 w-full object-cover"
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

              {/* Message Composer */}
              <div className="p-3 border-t border-slate-200 bg-white space-y-2">
                {showImageInput && (
                  <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowImageInput(false);
                        setImageUrlInput('');
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageInput(!showImageInput)}
                    className={`px-2.5 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      showImageInput || imageUrlInput
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                    title="Attach Image URL"
                  >
                    Image
                  </button>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!textInput.trim() && !imageUrlInput.trim())}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
              <h3 className="font-semibold text-slate-800 text-sm">Select a conversation</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Pick a channel from the left sidebar or start a new direct message with any developer on the team.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Start Direct Chat Modal */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded border border-slate-200 shadow-lg max-w-md w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Start Direct Message</h3>
              <button
                onClick={() => setShowDirectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded border border-slate-200">
              {availableDevs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No other developers found.</div>
              ) : (
                availableDevs.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{dev.name}</div>
                      <div className="text-[11px] text-slate-400">{dev.email} • {dev.role}</div>
                    </div>
                    <button
                      onClick={() => handleStartDirectChat(dev.id)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                    >
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Chat Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded border border-slate-200 shadow-lg max-w-md w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Create Group Channel</h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroupChat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Group Title <span className="text-rose-600">*</span></label>
                <input
                  type="text"
                  required
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="e.g. Backend Engineers, Sprint Beta"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Add Members ({selectedGroupDevIds.length} selected)
                </label>
                <div className="max-h-52 overflow-y-auto rounded border border-slate-200 divide-y divide-slate-100">
                  {availableDevs.map((dev) => {
                    const isSelected = selectedGroupDevIds.includes(dev.id);
                    return (
                      <label
                        key={dev.id}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{dev.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{dev.role}</div>
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
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!groupTitle.trim()}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

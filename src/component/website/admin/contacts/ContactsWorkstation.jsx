'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export default function ContactsWorkstation() {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'new', 'read', 'replied', 'closed', 'starred'
  const [feedback, setFeedback] = useState(null);

  // Active Inquiry Modal / Drawer
  const [selectedContact, setSelectedContact] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [replyHistory, setReplyHistory] = useState([]);
  const [mailerConfig, setMailerConfig] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reply Composer State
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter === 'starred') {
        params.append('starred', 'true');
      } else if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/staff/panel/contacts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
        setStats(data.stats || {});
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to fetch contact inquiries.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error loading contacts.' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Open Inquiry Details & fetch reply history
  const openContactDetails = async (contact) => {
    setSelectedContact(contact);
    setReplySubject(contact.subject ? `Re: ${contact.subject}` : 'Re: Your Inquiry');
    setReplyBody('');
    setModalOpen(true);
    setHistoryLoading(true);

    // Auto mark as read if it was 'new'
    if (contact.status === 'new') {
      try {
        await fetch('/api/staff/panel/contacts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: contact.id, status: 'read' }),
        });
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, status: 'read' } : c))
        );
      } catch (err) {
        console.error('Failed to auto-mark read:', err);
      }
    }

    try {
      const res = await fetch(`/api/staff/panel/contacts/reply?contact_id=${contact.id}`);
      const data = await res.json();
      if (data.success) {
        setReplyHistory(data.replies || []);
        setMailerConfig(data.mailerConfig || null);
      }
    } catch (err) {
      console.error('Failed to fetch reply history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Toggle Star
  const handleToggleStar = async (contact, e) => {
    e.stopPropagation();
    const newStarred = !contact.is_starred;
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, is_starred: newStarred } : c))
    );

    try {
      await fetch('/api/staff/panel/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contact.id, is_starred: newStarred }),
      });
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  // Update Status
  const handleUpdateStatus = async (contactId, newStatus) => {
    try {
      const res = await fetch('/api/staff/panel/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contactId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) =>
          prev.map((c) => (c.id === contactId ? { ...c, status: newStatus } : c))
        );
        if (selectedContact?.id === contactId) {
          setSelectedContact((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Inquiry
  const handleDeleteContact = async (contactId, name, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete inquiry from "${name}"?`)) return;

    try {
      const res = await fetch(`/api/staff/panel/contacts?id=${contactId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        if (selectedContact?.id === contactId) {
          setModalOpen(false);
        }
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to delete.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error deleting inquiry.' });
    }
  };

  // Send Email Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim() || !selectedContact) return;

    setSendingReply(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/staff/panel/contacts/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: selectedContact.id,
          subject: replySubject.trim(),
          message: replyBody.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setReplyBody('');
        setReplyHistory((prev) => [...prev, data.reply]);
        setContacts((prev) =>
          prev.map((c) => (c.id === selectedContact.id ? { ...c, status: 'replied', replies_count: (c.replies_count || 0) + 1 } : c))
        );
        setSelectedContact((prev) => ({ ...prev, status: 'replied' }));
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to send email reply.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error dispatching email reply.' });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Website Contacts & Inquiries
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Handle incoming messages from portal visitors, send replies via institutional or platform mailer, and maintain full communication logs.
          </p>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="font-semibold text-slate-500 hover:text-slate-700 ml-2">
              ×
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Inquiries</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">{stats.total_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">New / Unread</p>
          <p className="text-lg font-semibold font-mono text-blue-600 dark:text-blue-400 mt-1">{stats.new_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Replied</p>
          <p className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{stats.replied_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Starred Priority</p>
          <p className="text-lg font-semibold font-mono text-amber-600 dark:text-amber-400 mt-1">{stats.starred_count || 0}</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'new', 'read', 'replied', 'closed', 'starred'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1 text-xs rounded font-medium capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab === 'all' ? 'All Inquiries' : tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search inquiries by name, email, topic..."
            className="w-full sm:w-64 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white"
          />
          <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
            {contacts.length} inquiry{contacts.length === 1 ? '' : 'ies'}
          </span>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-x-auto shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <th className="py-2.5 px-3 w-8 text-center">★</th>
              <th className="py-2.5 px-3">Sender</th>
              <th className="py-2.5 px-3">Subject & Message Snippet</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Replies</th>
              <th className="py-2.5 px-3 font-mono">Date</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Loading inquiries...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No contact inquiries found matching filters.
                </td>
              </tr>
            ) : (
              contacts.map((c) => {
                const isNew = c.status === 'new';

                return (
                  <tr
                    key={c.id}
                    onClick={() => openContactDetails(c)}
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isNew ? 'bg-blue-50/20 dark:bg-blue-950/10 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(c, e)}
                        className={`text-base leading-none transition-colors ${
                          c.is_starred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-slate-400'
                        }`}
                        title={c.is_starred ? 'Starred' : 'Not starred'}
                      >
                        ★
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {c.name}
                        {isNew && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" title="Unread" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {c.email} {c.phone ? `• ${c.phone}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-md">
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        {c.subject || 'General Inquiry'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {c.message}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                          c.status === 'new'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                            : c.status === 'replied'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.replies_count || 0}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {String(c.created_at).slice(0, 10)}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openContactDetails(c)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded transition-colors"
                      >
                        Reply
                      </button>
                      <button
                        onClick={(e) => handleDeleteContact(c.id, c.name, e)}
                        className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Inquiry Detail & Reply Modal */}
      {modalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedContact.subject || 'General Inquiry'}</span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                      selectedContact.status === 'replied'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedContact.status}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  From: {selectedContact.name} &lt;{selectedContact.email}&gt; {selectedContact.phone ? `• Tel: ${selectedContact.phone}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedContact.status}
                  onChange={(e) => handleUpdateStatus(selectedContact.id, e.target.value)}
                  className="text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1"
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                  <option value="spam">Spam</option>
                </select>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Original message block */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                  <span>Received: {new Date(selectedContact.created_at).toLocaleString()}</span>
                  <button
                    onClick={(e) => handleToggleStar(selectedContact, e)}
                    className="hover:text-amber-500"
                  >
                    {selectedContact.is_starred ? '★ Starred' : '☆ Bookmark'}
                  </button>
                </div>
                <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedContact.message}
                </div>
              </div>

              {/* Reply Thread History */}
              {replyHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Previous Staff Replies ({replyHistory.length})
                  </p>
                  <div className="space-y-2.5">
                    {replyHistory.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded space-y-1.5"
                      >
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            Sent by {rep.staff_name || 'Staff'} ({rep.mailer_type === 'website' ? 'Website Mailer' : 'Main Mailer Fallback'})
                          </span>
                          <span>{new Date(rep.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {rep.reply_body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Composer Form */}
              <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Compose Email Reply
                  </p>
                  {mailerConfig && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {mailerConfig.isCustomMailer
                        ? `Using Website Mailer: ${mailerConfig.senderEmail}`
                        : `Using Platform Mailer Fallback: ${mailerConfig.senderEmail}`}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reply Message Body (HTML email formatted) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your email response here..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(selectedContact.id, selectedContact.name)}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Delete Inquiry
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={sendingReply || !replyBody.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                    >
                      {sendingReply ? 'Sending Email...' : 'Send Email Reply'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { BiTrash } from 'react-icons/bi';

export default function ContactsWorkstation() {
  const params = useParams();
  const domain = params?.domain || '';

  const baseApi = domain ? `/api/${domain}/staff/panel/contacts` : '/api/staff/panel/contacts';
  const replyApi = domain ? `/api/${domain}/staff/panel/contacts/reply` : '/api/staff/panel/contacts/reply';

  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'new', 'read', 'replied', 'closed', 'starred'
  const [feedback, setFeedback] = useState(null);

  // Staff granular permissions
  const [permissions, setPermissions] = useState({
    canView: true,
    canReply: true,
    canEdit: true,
    canDelete: true,
  });

  // Active In-Page Selected Inquiry
  const [selectedContact, setSelectedContact] = useState(null);
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
      const queryParams = new URLSearchParams();
      if (statusFilter === 'starred') {
        queryParams.append('starred', 'true');
      } else if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      if (searchTerm) queryParams.append('search', searchTerm);

      const res = await fetch(`${baseApi}?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
        setStats(data.stats || {});
        if (data.permissions) {
          setPermissions(data.permissions);
        }
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to fetch contact inquiries.' });
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
      setFeedback({ type: 'error', message: 'Network error loading contacts list.' });
    } finally {
      setLoading(false);
    }
  }, [baseApi, statusFilter, searchTerm]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Open Inquiry In-Page & fetch reply history
  const openContactDetails = async (contact) => {
    setSelectedContact(contact);
    setReplySubject(contact.subject ? `Re: ${contact.subject}` : 'Re: Your Inquiry');
    setReplyBody('');
    setHistoryLoading(true);

    // Auto mark as read if it was 'new'
    if (contact.status === 'new' && permissions.canEdit) {
      try {
        await fetch(baseApi, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: contact.id, status: 'read' }),
        });
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, status: 'read' } : c))
        );
        setSelectedContact((prev) => ({ ...prev, status: 'read' }));
      } catch (err) {
        console.error('Failed to auto-mark read:', err);
      }
    }

    try {
      const res = await fetch(`${replyApi}?contact_id=${contact.id}`);
      const data = await res.json();
      if (data.success) {
        setReplyHistory(data.replies || []);
        setMailerConfig(data.mailerConfig || null);
        if (data.canReply !== undefined) {
          setPermissions((prev) => ({ ...prev, canReply: Boolean(data.canReply) }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch reply history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Toggle Star
  const handleToggleStar = async (contact, e) => {
    if (e) e.stopPropagation();
    if (!permissions.canEdit) {
      setFeedback({ type: 'error', message: 'You do not have permission to edit inquiries.' });
      return;
    }

    const newStarred = !contact.is_starred;
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, is_starred: newStarred } : c))
    );
    if (selectedContact?.id === contact.id) {
      setSelectedContact((prev) => ({ ...prev, is_starred: newStarred }));
    }

    try {
      await fetch(baseApi, {
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
    if (!permissions.canEdit) {
      setFeedback({ type: 'error', message: 'You do not have permission to edit inquiry status.' });
      return;
    }

    try {
      const res = await fetch(baseApi, {
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
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to update status.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error updating status.' });
    }
  };

  // Delete Inquiry
  const handleDeleteContact = async (contactId, name, e) => {
    if (e) e.stopPropagation();
    if (!permissions.canDelete) {
      setFeedback({ type: 'error', message: 'You do not have permission to delete inquiries.' });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete inquiry from "${name}"?`)) return;

    try {
      const res = await fetch(`${baseApi}?id=${contactId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message || 'Inquiry deleted successfully.' });
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        if (selectedContact?.id === contactId) {
          setSelectedContact(null);
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
    if (!selectedContact) return;

    if (!permissions.canReply) {
      setFeedback({
        type: 'error',
        message: 'Forbidden: Your staff account does not have permission to send replies.',
      });
      return;
    }

    if (!replyBody.trim()) {
      setFeedback({ type: 'error', message: 'Please write a reply message.' });
      return;
    }

    setSendingReply(true);
    setFeedback(null);

    try {
      const res = await fetch(replyApi, {
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
        if (data.reply) {
          setReplyHistory((prev) => [...prev, data.reply]);
        }
        setContacts((prev) =>
          prev.map((c) =>
            c.id === selectedContact.id
              ? { ...c, status: 'replied', replies_count: (c.replies_count || 0) + 1 }
              : c
          )
        );
        setSelectedContact((prev) => ({ ...prev, status: 'replied' }));
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to dispatch email reply.' });
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
      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Website Contacts & Inquiries
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Incoming messages from portal visitors, send replies via website Brevo mailer, and maintain full communication logs.
          </p>
        </div>
        {selectedContact && (
          <button
            type="button"
            onClick={() => setSelectedContact(null)}
            className="self-start sm:self-auto px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            ← View All Inquiries
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded-md border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-2 leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Inquiries</p>
          <p className="text-lg font-semibold font-mono text-slate-900 dark:text-white mt-1">{stats.total_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">New / Unread</p>
          <p className="text-lg font-semibold font-mono text-blue-600 dark:text-blue-400 mt-1">{stats.new_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Replied</p>
          <p className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{stats.replied_count || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Starred Priority</p>
          <p className="text-lg font-semibold font-mono text-amber-600 dark:text-amber-400 mt-1">{stats.starred_count || 0}</p>
        </div>
      </div>

      {/* Main Workstation Body: Split-pane when an inquiry is selected */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full items-start">
        {/* Left Side: Search, Filter Tabs & Inquiries Table */}
        <div className={`space-y-3 ${selectedContact ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {['all', 'new', 'read', 'replied', 'closed', 'starred'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition-colors cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inquiries..."
                className="w-full sm:w-44 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                {contacts.length}
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                  <th className="py-2.5 px-3 w-8 text-center">★</th>
                  <th className="py-2.5 px-3">Sender</th>
                  {!selectedContact && <th className="py-2.5 px-3">Subject & Inquiry</th>}
                  <th className="py-2.5 px-3 text-center">Status</th>
                  {!selectedContact && <th className="py-2.5 px-3 text-center">Replies</th>}
                  {!selectedContact && <th className="py-2.5 px-3 font-mono">Date</th>}
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={selectedContact ? 4 : 7} className="py-12 text-center">
                      <div className="flex justify-center items-center py-2">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={selectedContact ? 4 : 7} className="py-8 text-center text-slate-400">
                      No contact inquiries found matching filters.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => {
                    const isNew = c.status === 'new';
                    const isSelected = selectedContact?.id === c.id;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => openContactDetails(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-l-2 border-primary'
                            : isNew
                            ? 'bg-blue-50/20 dark:bg-blue-950/10 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(c, e)}
                            className={`text-base leading-none transition-colors cursor-pointer ${
                              c.is_starred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-slate-400'
                            }`}
                            title={c.is_starred ? 'Starred Priority' : 'Bookmark'}
                          >
                            ★
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                            <span className="truncate">{c.name}</span>
                            {isNew && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Unread" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {c.email}
                          </div>
                        </td>
                        {!selectedContact && (
                          <td className="py-2.5 px-3 max-w-xs sm:max-w-md">
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                              {c.subject || 'General Inquiry'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {c.message}
                            </div>
                          </td>
                        )}
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
                        {!selectedContact && (
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {c.replies_count || 0}
                            </span>
                          </td>
                        )}
                        {!selectedContact && (
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {String(c.created_at).slice(0, 10)}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openContactDetails(c)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                          >
                            {isSelected ? 'Viewing' : permissions.canReply ? 'Open' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: In-Page Detail & Reply Workstation (No popup modal!) */}
        {selectedContact && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-4 shadow-2xs">
            {/* Detail Pane Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedContact.subject || 'General Inquiry'}
                  </h2>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                      selectedContact.status === 'replied'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : selectedContact.status === 'new'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {selectedContact.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Sender: {selectedContact.name} &lt;{selectedContact.email}&gt; {selectedContact.phone ? `• Tel: ${selectedContact.phone}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {permissions.canEdit && (
                  <select
                    value={selectedContact.status}
                    onChange={(e) => handleUpdateStatus(selectedContact.id, e.target.value)}
                    className="text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200"
                  >
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="closed">Closed</option>
                    <option value="spam">Spam</option>
                  </select>
                )}

                {permissions.canDelete && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteContact(selectedContact.id, selectedContact.name, e)}
                    className="p-1.5 rounded border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Delete Inquiry"
                  >
                    <BiTrash className="text-sm" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Close Detail"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Original visitor inquiry message */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                <span>Received: {new Date(selectedContact.created_at).toLocaleString()}</span>
                <button
                  type="button"
                  onClick={(e) => handleToggleStar(selectedContact, e)}
                  className="hover:text-amber-500 transition-colors cursor-pointer"
                >
                  {selectedContact.is_starred ? '★ Starred' : '☆ Bookmark'}
                </button>
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedContact.message}
              </div>
            </div>

            {/* Thread History: Previous Staff Replies */}
            {historyLoading ? (
              <div className="py-4 text-center text-slate-400 text-xs">Loading previous replies...</div>
            ) : replyHistory.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Staff Communication Thread ({replyHistory.length})
                </p>
                <div className="space-y-2.5">
                  {replyHistory.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-md space-y-1.5"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {rep.staff_name || 'Staff Desk'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider ${
                            rep.mailer_type === 'website'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {rep.mailer_type === 'website' ? 'Website Mailer' : 'Main Fallback'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider ${
                            rep.delivery_status === 'SENT'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
                          }`}>
                            {rep.delivery_status || 'SENT'}
                          </span>
                        </div>
                        <span>{new Date(rep.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {rep.reply_body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* In-Page Reply Composer Form */}
            {permissions.canReply ? (
              <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Send Email Reply
                  </p>
                  {mailerConfig && (
                    <div className="flex items-center gap-1 text-[10px]">
                      {mailerConfig.isCustomMailer ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ Website Mailer: {mailerConfig.senderName} &lt;{mailerConfig.senderEmail}&gt;
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title="Configure custom Brevo credentials in Staff Panel > Configuration > Mailer">
                          ⚠ Using Platform Mailer Fallback ({mailerConfig.senderEmail || 'Default'})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Response Message (Formatted email sent to {selectedContact.email}) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your official response to this visitor inquiry..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReplyBody('')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
                  >
                    Clear Draft
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReply || !replyBody.trim()}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 min-w-[130px] flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {sendingReply ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Send Email Reply'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                <p className="font-semibold">View-Only Access</p>
                <p className="mt-0.5 text-[11px]">
                  Your staff account does not have permission to reply to contact messages. Communications module access is required.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

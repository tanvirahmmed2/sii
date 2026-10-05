'use client';

import { useState, useEffect, useContext, useCallback, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Context } from 'src/component/helper/Context';

export default function ContactDetailPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const resolvedParams = params ? (typeof params.then === 'function' ? use(params) : params) : null;
  const contactId = routeParams?.id || resolvedParams?.id;

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canReply = permissions.includes('contacts') || user?.role === 'admin' || user?.role === 'manager';
  const canDelete = permissions.includes('contacts') || user?.role === 'admin' || user?.role === 'manager';

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [statusVal, setStatusVal] = useState('new');
  const [replySending, setReplySending] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 5000);
  };

  const fetchContact = useCallback(async (showLoading = false) => {
    if (!contactId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/marketing/developer/contacts/${contactId}`);
      const data = await res.json();
      if (data.success && data.contact) {
        setContact(data.contact);
        setReplyText(data.contact.reply || '');
        setAdminNotes(data.contact.admin_notes || '');
        setStatusVal(data.contact.status || 'new');
      } else {
        setError(data.error || 'Failed to load contact inquiry.');
      }
    } catch (err) {
      console.error('Error fetching contact:', err);
      setError('A network error occurred while loading inquiry details.');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContact(true);
  }, [fetchContact]);

  // Send official email reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!canReply) {
      notify('Access denied: Permission contacts required to reply.', 'error');
      return;
    }
    if (!replyText.trim()) {
      notify('Please write a reply message before sending.', 'error');
      return;
    }

    setReplySending(true);
    try {
      const res = await fetch('/api/marketing/developer/contacts/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          reply: replyText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        notify('Reply sent successfully via email and inquiry marked as Replied!');
        fetchContact(false);
      } else {
        notify(data.error || 'Failed to send reply email.', 'error');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      notify('Network error while dispatching email reply.', 'error');
    } finally {
      setReplySending(false);
    }
  };

  // Update status
  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/marketing/developer/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusVal(newStatus);
        setContact((prev) => (prev ? { ...prev, status: newStatus } : prev));
        notify(`Status updated to ${newStatus}.`);
      } else {
        notify(data.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      notify('Error updating status.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Save internal admin notes
  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      const res = await fetch('/api/marketing/developer/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          admin_notes: adminNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify('Internal notes saved successfully.');
      } else {
        notify(data.error || 'Failed to save notes.', 'error');
      }
    } catch (err) {
      notify('Error saving notes.', 'error');
    } finally {
      setNotesSaving(false);
    }
  };

  // Delete contact inquiry
  const handleDelete = async () => {
    if (!canDelete) {
      notify('Access denied: Permission contacts required to delete.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this contact inquiry? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/marketing/developer/contacts/${contact.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        notify('Contact inquiry deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/developer/contacts');
        }, 1000);
      } else {
        notify(data.error || 'Failed to delete contact inquiry.', 'error');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
      notify('Network error when attempting deletion.', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center text-slate-500">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Loading Inquiry Details...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Retrieving communication records and sender history.</p>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{error || 'Inquiry Not Found'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The requested contact message could not be loaded or may have been deleted.
        </p>
        <Link
          href="/developer/contacts"
          className="inline-block px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          Back to All Contacts
        </Link>
      </div>
    );
  }

  const isReplied = ['replied', 'resolved'].includes(String(statusVal).toLowerCase());

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

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/developer/contacts"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Contacts
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Inquiry #{contact.id}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">{contact.subject}</h1>
            <span
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase ${
                isReplied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
              }`}
            >
              {statusVal}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Received from <strong className="text-slate-800 dark:text-slate-200 font-medium">{contact.name}</strong> on{' '}
            {new Date(contact.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Status selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusVal}
              disabled={statusLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="in_progress">In Progress</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchContact(true)}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            Refresh
          </button>

          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900 text-rose-600 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Inquiry Meta & Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Sender Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
          <h2 className="text-[10px] font-semibold text-slate-400 uppercase">
            Sender Information
          </h2>

          <div className="space-y-2 text-xs">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">{contact.name}</span>
              <span className="text-[11px] text-slate-400">Inquiry Sender</span>
            </div>

            <div>
              <a
                href={`mailto:${contact.email}`}
                className="font-mono text-slate-800 dark:text-slate-200 hover:underline break-all block"
              >
                {contact.email}
              </a>
            </div>

            {contact.phone && (
              <div>
                <span className="font-mono text-slate-700 dark:text-slate-300">{contact.phone}</span>
              </div>
            )}

            {contact.institution && (
              <div>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{contact.institution}</span>
                <span className="text-[11px] text-slate-400 block">Institution / Company</span>
              </div>
            )}
          </div>

          {/* Internal Admin Notes */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Staff Internal Notes
            </label>
            <textarea
              rows={3}
              placeholder="Private notes for staff..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none"
            />
            <button
              type="button"
              disabled={notesSaving}
              onClick={handleSaveNotes}
              className="w-full py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              {notesSaving ? 'Saving...' : 'Save Internal Note'}
            </button>
          </div>
        </div>

        {/* Right Column: Original Message & Reply Form */}
        <div className="md:col-span-2 space-y-4">
          {/* Inquiry Message Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Inquiry Message</h2>
              <span className="text-xs text-slate-400">
                {new Date(contact.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3 rounded text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {contact.message}
            </div>
          </div>

          {/* Email Reply Composer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {isReplied ? 'Previous Response / Send Follow-Up' : 'Compose Email Reply'}
              </h3>
              {contact.replied_by_name && (
                <span className="text-[11px] text-slate-400">
                  Last reply by: <strong className="text-slate-700 dark:text-slate-300">{contact.replied_by_name}</strong>
                </span>
              )}
            </div>

            <form onSubmit={handleSendReply} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Message to {contact.email}
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder={`Write your response to ${contact.name}... This will be delivered directly to ${contact.email} via Brevo mailer.`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-400">
                  Sends formatted official email notification directly to user.
                </span>

                <button
                  type="submit"
                  disabled={replySending || !replyText.trim() || !canReply}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  {replySending ? 'Sending...' : 'Send Email Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

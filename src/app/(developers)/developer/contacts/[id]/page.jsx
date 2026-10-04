'use client';

import { useState, useEffect, useContext, useCallback, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiBook,
  FiSend,
  FiTrash2,
  FiRefreshCw,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiUser,
  FiShield,
  FiCheck,
  FiX,
  FiMessageSquare,
} from 'react-icons/fi';
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 animate-spin">
          <FiRefreshCw className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Loading Inquiry Details...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Retrieving communication records and sender history.</p>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <FiAlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{error || 'Inquiry Not Found'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The requested contact message could not be loaded or may have been deleted.
        </p>
        <Link
          href="/developer/contacts"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Back to All Contacts</span>
        </Link>
      </div>
    );
  }

  const isReplied = ['replied', 'resolved'].includes(String(statusVal).toLowerCase());

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? <FiAlertCircle className="w-4 h-4 shrink-0" /> : <FiCheckCircle className="w-4 h-4 shrink-0" />}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/developer/contacts"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Contacts</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Inquiry #{contact.id}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{contact.subject}</h1>
            <span
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                isReplied
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {statusVal}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Received from <strong className="text-slate-800 dark:text-slate-200">{contact.name}</strong> on{' '}
            {new Date(contact.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Status selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusVal}
              disabled={statusLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
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
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh details"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>

          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="p-2 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Delete inquiry"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Inquiry Meta & Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Sender Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Sender Information
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <FiUser className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">{contact.name}</span>
                <span className="text-[11px] text-slate-400">Inquiry Sender</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FiMail className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <a
                  href={`mailto:${contact.email}`}
                  className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline break-all block"
                >
                  {contact.email}
                </a>
              </div>
            </div>

            {contact.phone && (
              <div className="flex items-start gap-2.5">
                <FiPhone className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{contact.phone}</span>
                </div>
              </div>
            )}

            {contact.institution && (
              <div className="flex items-start gap-2.5">
                <FiBook className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{contact.institution}</span>
                  <span className="text-[11px] text-slate-400 block">Institution / Company</span>
                </div>
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
            <button
              type="button"
              disabled={notesSaving}
              onClick={handleSaveNotes}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {notesSaving ? 'Saving...' : 'Save Internal Note'}
            </button>
          </div>
        </div>

        {/* Right Column: Original Message & Reply Form */}
        <div className="md:col-span-2 space-y-5">
          {/* Inquiry Message Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Inquiry Message</h2>
              <span className="text-xs text-slate-400">
                {new Date(contact.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {contact.message}
            </div>
          </div>

          {/* Email Reply Composer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FiMail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isReplied ? 'Previous Response / Send Follow-Up' : 'Compose Email Reply'}
                </h3>
              </div>
              {contact.replied_by_name && (
                <span className="text-[11px] text-slate-400">
                  Last reply by: <strong className="text-slate-700 dark:text-slate-300">{contact.replied_by_name}</strong>
                </span>
              )}
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Message to {contact.email}
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={`Write your response to ${contact.name}... This will be delivered directly to ${contact.email} via Brevo mailer.`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-slate-400">
                  Sends formatted official email notification directly to user.
                </span>

                <button
                  type="submit"
                  disabled={replySending || !replyText.trim() || !canReply}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <FiSend className={`w-4 h-4 ${replySending ? 'animate-pulse' : ''}`} />
                  <span>{replySending ? 'Sending Email...' : 'Send Email Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

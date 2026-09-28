'use client';

import { useState, useEffect, useContext, useCallback, use } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BiArrowBack,
  BiUser,
  BiEnvelope,
  BiCheckCircle,
  BiTimeFive,
  BiSend,
  BiTrash,
  BiRefresh,
  BiCheckShield,
  BiMessageDetail,
  BiX,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function ContactDetailPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const resolvedParams = params ? (typeof params.then === 'function' ? use(params) : params) : null;
  const contactId = routeParams?.id || resolvedParams?.id;

  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canReply = permissions.includes('contacts');
  const canDelete = permissions.includes('contacts');

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 6000);
  };

  const fetchContact = useCallback(async (showLoading = false) => {
    if (!contactId) return;
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await fetch(`/api/developer/contacts/${contactId}`);
      const data = await res.json();
      if (data.success && data.contact) {
        setContact(data.contact);
        setReplyText(data.contact.reply || '');
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

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!canReply) {
      notify('Access denied: Support, Manager, or Admin role required to reply.', 'error');
      return;
    }
    if (!replyText.trim()) {
      notify('Please write a reply message before sending.', 'error');
      return;
    }

    setReplySending(true);
    try {
      const res = await fetch('/api/developer/contacts/reply', {
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
        if (data.record) {
          setContact((prev) => ({ ...prev, ...data.record }));
        }
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

  const handleDelete = async () => {
    if (!canDelete) {
      notify('Access denied: Only administrators and managers have permission to delete.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this contact inquiry? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/developer/contacts/${contact.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        notify('Contact inquiry deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/developer/contacts');
        }, 1200);
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
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <BiMessageDetail className="text-2xl" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Loading Inquiry Details...</h3>
        <p className="text-xs text-slate-500">Retrieving communication records and sender history.</p>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <BiX className="text-2xl" />
        </div>
        <h3 className="text-base font-bold text-slate-900">{error || 'Inquiry Not Found'}</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The requested contact message could not be loaded or may have been deleted.
        </p>
        <Link
          href="/developer/contacts"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <BiArrowBack className="text-base" />
          <span>Back to All Contacts</span>
        </Link>
      </div>
    );
  }

  const isReplied = contact.status === 'REPLIED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {actionNotice.text && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <BiCheckCircle className="text-base" />
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice({ text: '', type: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <BiX className="text-base" />
          </button>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/developer/contacts"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <BiArrowBack className="text-base" />
              <span>Contacts</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-900">Inquiry #{contact.id}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{contact.subject}</h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isReplied
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isReplied ? 'Replied' : 'New'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Received from <strong className="text-slate-800">{contact.name}</strong> on{' '}
            {new Date(contact.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchContact(true)}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh details"
          >
            <BiRefresh className="text-lg" />
          </button>

          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <BiTrash className="text-base" />
              <span>{deleting ? 'Deleting...' : 'Delete Inquiry'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Permissions Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <BiCheckShield className="text-indigo-600 text-lg shrink-0" />
          <span>
            {canReply ? (
              <span className="text-emerald-700">You can compose and send email replies via the mailer.</span>
            ) : (
              <span className="text-amber-700">Sending email replies requires the <strong className="font-mono">contacts</strong> permission.</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span
            className={`px-2.5 py-1 rounded-lg border ${
              canReply
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            Reply: {canReply ? 'Enabled' : 'Disabled'}
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg border ${
              canDelete
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            Delete: {canDelete ? 'Admin & Manager' : 'Restricted'}
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sender Details & Original Message */}
        <div className="lg:col-span-6 space-y-6">
          {/* Sender Details Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sender Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Sender Name</span>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <BiUser className="text-slate-400" />
                  <span>{contact.name}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Email Address</span>
                <div className="font-mono text-slate-800 text-xs flex items-center gap-1.5">
                  <BiEnvelope className="text-slate-400" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-indigo-600 hover:underline truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Date Received</span>
                <div className="text-slate-700 font-semibold flex items-center gap-1.5">
                  <BiTimeFive className="text-slate-400" />
                  <span>{new Date(contact.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Last Updated</span>
                <div className="text-slate-700 font-semibold flex items-center gap-1.5">
                  <BiRefresh className="text-slate-400" />
                  <span>{new Date(contact.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Original Message Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inquiry Message</h3>
              <span className="text-[11px] text-slate-400">Subject: <strong className="text-slate-700">{contact.subject}</strong></span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-normal">
              {contact.message}
            </div>
          </div>
        </div>

        {/* Right Column: Reply History & Mailer Composer */}
        <div className="lg:col-span-6 space-y-6">
          {/* Previous Reply History if exists */}
          {contact.reply && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <BiCheckCircle className="text-lg" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Previous Response Sent</h4>
                    <p className="text-[11px] text-emerald-700">
                      {contact.updated_at ? new Date(contact.updated_at).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
                {contact.replied_by_name && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    By: {contact.replied_by_name} ({contact.replied_by_role || 'Staff'})
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                {contact.reply}
              </div>
            </div>
          )}

          {/* Reply Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {contact.reply ? 'Send Follow-up Email' : 'Reply via Mailer'}
                </h3>
                <p className="text-xs text-slate-500">
                  Compose a reply that will be dispatched directly to <strong className="text-slate-700">{contact.email}</strong>.
                </p>
              </div>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Response Content
                </label>
                <textarea
                  rows={8}
                  required
                  disabled={!canReply || replySending}
                  placeholder={
                    canReply
                      ? 'Type your response to the user here. Submitting will deliver an official email response and mark the status as Replied...'
                      : 'You do not have authorization to send replies (Support, Manager, or Admin role required).'
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                <BiEnvelope className="text-indigo-600 text-base shrink-0" />
                <span>
                  The recipient will receive an HTML email containing this message, your staff credentials, and a quoted copy of their original message.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/developer/contacts"
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Back to List
                </Link>

                <button
                  type="submit"
                  disabled={!canReply || replySending || !replyText.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  <BiSend className="text-base" />
                  <span>{replySending ? 'Dispatching Email...' : 'Send Reply via Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

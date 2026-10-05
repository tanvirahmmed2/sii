'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCreator } from '../layout';

export default function CreatorTicketsPage() {
  const { creatorId, tickets = [], refetch } = useCreator();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    setErr('');

    try {
      const res = await fetch('/api/marketing/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_ticket',
          creatorId: Number(creatorId),
          subject,
          category,
          priority,
          message,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMsg(`Ticket ${json.ticket?.ticket_number || ''} submitted successfully.`);
        setSubject('');
        setMessage('');
        setShowCreateForm(false);
        if (refetch) await refetch();
      } else {
        setErr(json.error || 'Failed to submit ticket.');
      }
    } catch (e) {
      setErr('Network error while creating ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = tickets.filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.ticket_number?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.status?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Support Tickets
          </h1>
          <p className="text-slate-500 text-xs">
            Submit technical questions, domain setup assistance, or feature requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch && refetch()}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
          >
            {showCreateForm ? 'Cancel Form' : 'New Ticket'}
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          {msg}
        </div>
      )}
      {err && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {err}
        </div>
      )}

      {/* Create Ticket Form */}
      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">Open New Support Ticket</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                placeholder="e.g. Domain SSL verification issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="TECHNICAL">Technical Issue</option>
                  <option value="BILLING">Billing & Plans</option>
                  <option value="DOMAINS">Domain & DNS</option>
                  <option value="FEATURE">Feature Request</option>
                  <option value="GENERAL">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Message Description *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe your issue with relevant error details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Tickets ({filtered.length})
          </h2>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-56 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No support tickets found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Ticket #</th>
                  <th className="pb-2">Subject</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono text-slate-900 font-medium">
                      {t.ticket_number || `TCK-${t.id}`}
                    </td>
                    <td className="py-2.5 font-medium text-slate-900">
                      {t.subject}
                    </td>
                    <td className="py-2.5 text-slate-600 capitalize">
                      {String(t.category || '').toLowerCase()}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-slate-50 text-slate-700 border-slate-200">
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                          t.status === 'RESOLVED' || t.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {t.status || 'OPEN'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/creator/${creatorId}/tickets/${t.id}`}
                        className="text-slate-800 hover:underline font-medium"
                      >
                        Open Discussion
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

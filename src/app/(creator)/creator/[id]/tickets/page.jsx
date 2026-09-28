'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCreator } from '../layout';
import {
  BiHeadphone,
  BiPlus,
  BiMinus,
  BiCheckCircle,
  BiMessageSquareDetail,
  BiLoaderAlt,
  BiRefresh,
  BiSearch,
} from 'react-icons/bi';

export default function CreatorTicketsPage() {
  const router = useRouter();
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
      const res = await fetch('/api/creator', {
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
        setMsg(`Ticket ${json.ticket.ticket_number} submitted! Support will respond shortly.`);
        setSubject('');
        setMessage('');
        setShowCreateForm(false);
        await refetch();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Support
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Submit technical inquiries, billing questions, DNS configuration help, or platform suggestions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch && refetch()}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <BiRefresh className="text-lg" />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((p) => !p)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              showCreateForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {showCreateForm ? <BiMinus className="text-base" /> : <BiPlus className="text-base" />}
            <span>{showCreateForm ? 'Hide Form' : 'New Ticket'}</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <BiCheckCircle className="text-lg text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {err}
        </div>
      )}

      {/* Ticket Creation Form Card */}
      {showCreateForm && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Create Support Inquiry</h3>
            <p className="text-xs text-slate-500">Our support engineers typically respond within 2-4 hours.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assistance with custom domain DNS propagation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                >
                  <option value="TECHNICAL">Technical Issue</option>
                  <option value="BILLING">Billing & Plans</option>
                  <option value="DOMAIN">Custom Domain / SSL</option>
                  <option value="FEATURE">Feature Suggestion</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message Detail *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe your inquiry or question with relevant details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {submitting ? <BiLoaderAlt className="animate-spin text-sm" /> : null}
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search tickets by subject, category, #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {tickets.length} tickets
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">Ticket #</th>
                <th className="px-4 py-3 whitespace-nowrap">Subject</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Priority</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Opened</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Conversation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No support tickets found. Click &quot;New Ticket&quot; if you need assistance!
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const statusColors = {
                    OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
                    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  const priorityColors = {
                    URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
                    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
                    MEDIUM: 'bg-slate-100 text-slate-700 border-slate-200',
                    LOW: 'bg-slate-50 text-slate-500 border-slate-200',
                  };

                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/creator/${creatorId}/tickets/${t.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {t.ticket_number}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px] uppercase tracking-wider">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] uppercase ${priorityColors[t.priority] || priorityColors.MEDIUM}`}>
                          {t.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            statusColors[t.status] || 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {t.status || 'OPEN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/creator/${creatorId}/tickets/${t.id}`}
                          className="inline-flex items-center gap-1 text-slate-900 hover:text-white bg-slate-100 hover:bg-slate-900 font-semibold px-3 py-1 rounded-lg transition-colors text-xs"
                        >
                          <span>Open Thread →</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

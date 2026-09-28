'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BiSearch,
  BiTrash,
  BiRefresh,
  BiEnvelope,
  BiCheckCircle,
  BiTimeFive,
  BiX,
  BiCheckShield,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function AdminContactsPage() {
  const router = useRouter();
  const { user } = useContext(Context);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canReply = permissions.includes('contacts');
  const canDelete = permissions.includes('contacts');

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [actionNotice, setActionNotice] = useState({ text: '', type: '' });

  const notify = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice({ text: '', type: '' }), 6000);
  };

  const fetchContacts = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/developer/contacts');
      const data = await res.json();
      if (data.success) {
        setContacts(data.records || []);
      }
    } catch (e) {
      console.error('Error loading contacts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts(true);
  }, [fetchContacts]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!canDelete) {
      notify('Permission denied: Only Admin and Manager roles can delete contacts.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this contact message? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/developer/contacts/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        notify('Contact message deleted successfully.');
        fetchContacts();
      } else {
        notify(data.error || 'Failed to delete contact.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Network error deleting contact.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Stats calculation
  const totalCount = contacts.length;
  const newCount = contacts.filter((c) => c.status === 'NEW').length;
  const repliedCount = contacts.filter((c) => c.status === 'REPLIED').length;

  const filtered = contacts.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.message?.toLowerCase().includes(q) ||
      c.reply?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contact Messages</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Inquiries
            </span>
          </div>
          <p className="text-xs text-slate-500">
            View public inquiries, compose mailer email replies on dedicated detail pages, and manage communications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchContacts(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold"
            title="Refresh contacts"
          >
            <BiRefresh className="text-lg" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Permissions Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <BiCheckShield className="text-indigo-600 text-lg shrink-0" />
          <span>
            {canReply ? (
              <span className="text-emerald-700">You have authorization to reply to contact inquiries.</span>
            ) : (
              <span className="text-amber-700">Replying to inquiries requires the <strong className="font-mono">contacts</strong> permission.</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className={`px-2.5 py-1 rounded-lg border ${canReply ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            Reply: {canReply ? 'Enabled' : 'Disabled'}
          </span>
          <span className={`px-2.5 py-1 rounded-lg border ${canDelete ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            Delete: {canDelete ? 'Admin & Manager' : 'Restricted'}
          </span>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Inquiries</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <BiEnvelope className="text-xl" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600">New / Unanswered</span>
            <div className="text-2xl font-bold text-blue-700 mt-1">{newCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BiTimeFive className="text-xl" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600">Replied / Solved</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{repliedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BiCheckCircle className="text-xl" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            {['ALL', 'NEW', 'REPLIED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL' ? 'All Messages' : tab === 'NEW' ? 'New' : 'Replied'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Search name, email, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium shrink-0">
              <span className="font-bold text-slate-800">{filtered.length}</span> of {contacts.length}
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Sender</th>
                <th className="px-4 py-3 whitespace-nowrap">Subject & Message</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Received</th>
                <th className="px-4 py-3 whitespace-nowrap">Reply Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    Loading contact inquiries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    No contact records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isReplied = c.status === 'REPLIED';
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/developer/contacts/${c.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">#{c.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{c.email}</div>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-semibold text-slate-900 truncate">{c.subject}</div>
                        <div className="text-slate-500 text-[11px] truncate">{c.message}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isReplied
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isReplied ? 'Replied' : 'New'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs text-[11px]">
                        {isReplied ? (
                          <div className="text-emerald-700 truncate">
                            <span className="font-semibold">By: </span>
                            {c.replied_by_name || 'Staff'}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No reply yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/developer/contacts/${c.id}`}
                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px]"
                          >
                            {isReplied ? 'View / Update' : 'Reply'}
                          </Link>

                          {canDelete && (
                            <button
                              type="button"
                              disabled={deletingId === c.id}
                              onClick={(e) => handleDelete(c.id, e)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete inquiry (Admin/Manager)"
                            >
                              <BiTrash className="text-base" />
                            </button>
                          )}
                        </div>
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

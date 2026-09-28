'use client';

import { useState, useEffect, useContext } from 'react';
import { Context } from '@/components/helper/Context';
import {
  BiSearch,
  BiTrash,
  BiRefresh,
  BiEnvelope,
  BiLoaderAlt,
  BiShieldQuarter,
  BiCheckCircle,
  BiUserX,
  BiInfoCircle,
} from 'react-icons/bi';

export default function AdminSubscribersPage() {
  const { user } = useContext(Context);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canView = permissions.includes('subscribers');
  const canDelete = permissions.includes('subscribers');

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/subscribers');
      const data = await res.json();
      if (data.success) {
        setSubs(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchSubs();
    } else {
      setLoading(false);
    }
  }, [canView]);

  const handleDelete = async (id) => {
    if (!canDelete) {
      alert('Access denied: subscribers permission required.');
      return;
    }
    if (!confirm('Are you sure you want to delete this subscriber record?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/developer/subscribers?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchSubs();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  if (!canView) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 text-3xl">
          <BiShieldQuarter />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Access requires the <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">subscribers</span> permission.
        </p>
      </div>
    );
  }

  const filtered = subs.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return s.email?.toLowerCase().includes(q) || s.source?.toLowerCase().includes(q);
  });

  const activeCount = subs.filter((s) => s.status === 'SUBSCRIBED').length;
  const unsubscribedCount = subs.filter((s) => s.status === 'UNSUBSCRIBED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Newsletter Subscribers</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Admin • Manager • Support
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View audiences registered to receive platform updates, product news, and release notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSubs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Refresh table data"
          >
            <BiRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info notice about organic subscription source */}
      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-800 dark:text-sky-300">
        <BiInfoCircle className="text-base text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>Organic Subscriptions Only:</strong> Subscribers enter the database via the public website footer form. Manual subscriber creation is disabled to preserve authentic user consent and deliverability.
        </span>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Audience</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{subs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xl">
            <BiEnvelope />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Subscribed</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <BiCheckCircle />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unsubscribed</p>
            <p className="text-2xl font-bold text-slate-500 dark:text-slate-400 mt-0.5">{unsubscribedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-xl">
            <BiUserX />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative w-full sm:w-72">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search by email or acquisition channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-800 dark:text-white">{filtered.length}</span> of {subs.length} subscribers
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Subscriber Email</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Acquisition Channel</th>
                <th className="px-4 py-3 whitespace-nowrap">Subscribed Date</th>
                {canDelete && <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="py-12 text-center text-slate-400">
                    <BiLoaderAlt className="animate-spin text-2xl mx-auto mb-2 text-secondary" />
                    <span>Loading subscribers...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <BiEnvelope className="text-3xl mx-auto mb-2 opacity-50" />
                    <span>{searchTerm ? 'No subscribers matching your search.' : 'No subscribers in database yet.'}</span>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">#{s.id}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'SUBSCRIBED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{s.source || 'FOOTER'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString() : '—'}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete subscriber record"
                        >
                          {deletingId === s.id ? <BiLoaderAlt className="animate-spin text-sm" /> : <BiTrash className="text-base" />}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

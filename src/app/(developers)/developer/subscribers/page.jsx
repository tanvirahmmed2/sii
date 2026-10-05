'use client';

import { useState, useEffect, useContext } from 'react';
import { Context } from 'src/component/helper/Context';

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
      const res = await fetch('/api/marketing/developer/subscribers');
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
      const res = await fetch(`/api/marketing/developer/subscribers?id=${id}`, {
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
      <div className="w-full min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded p-6 text-center space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access requires the <span className="font-mono text-slate-700 dark:text-slate-300">subscribers</span> permission.
          </p>
        </div>
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Newsletter Subscribers</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Audience
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
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Info notice about organic subscription source */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-800 dark:text-slate-200">Organic Subscriptions Only:</span> Subscribers enter the database via the public website footer form. Manual subscriber creation is disabled to preserve authentic user consent and deliverability.
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Total Audience</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">{subs.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Active Subscribed</p>
          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 space-y-1">
          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Unsubscribed</p>
          <p className="text-base font-semibold text-slate-500 dark:text-slate-400">{unsubscribedCount}</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by email or acquisition channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {subs.length} subscribers
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Subscriber Email</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Channel</th>
                <th className="pb-2 whitespace-nowrap">Subscribed Date</th>
                {canDelete && <th className="pb-2 text-right whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="py-12 text-center text-slate-400 text-xs font-normal">
                    Loading subscribers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="py-12 text-center text-slate-400 text-xs font-normal">
                    {searchTerm ? 'No subscribers matching your search.' : 'No subscribers in database yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-mono font-medium text-slate-400">#{s.id}</td>
                    <td className="py-2.5 font-mono text-slate-800 dark:text-slate-200 font-medium">{s.email}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium ${
                        s.status === 'SUBSCRIBED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{s.source || 'FOOTER'}</td>
                    <td className="py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString() : '—'}
                    </td>
                    {canDelete && (
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id)}
                          className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Delete
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

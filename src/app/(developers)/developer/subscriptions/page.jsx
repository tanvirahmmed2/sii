'use client';

import { useState, useEffect } from 'react';
import SubscriptionForm from 'src/component/marketing/developer/forms/SubscriptionForm';

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/subscriptions');
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
    fetchSubs();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/subscriptions?id=${id}`, {
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

  const filtered = subs.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(s.creator_id).includes(q) ||
      String(s.package_id).includes(q) ||
      s.status?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Creator Subscriptions</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Subscription
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Active, trialing, and past-due platform package memberships.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSubs}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              showForm
                ? 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
            }`}
          >
            {showForm ? 'Hide Form' : 'Add Subscription'}
          </button>
        </div>
      </div>

      {showForm && (
        <SubscriptionForm
          apiEndpoint="/api/marketing/developer/subscriptions"
          onSuccess={() => {
            setShowForm(false);
            fetchSubs();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search subscriptions by creator ID or package ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {subs.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Creator ID</th>
                <th className="pb-2 whitespace-nowrap">Package ID</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Period Start</th>
                <th className="pb-2 whitespace-nowrap">Period End</th>
                <th className="pb-2 whitespace-nowrap">Cancel At End</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">Loading subscriptions...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">No subscriptions found.</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-mono font-medium text-slate-400">#{s.id}</td>
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">Creator #{s.creator_id}</td>
                    <td className="py-2.5 font-normal text-slate-700 dark:text-slate-300">Package #{s.package_id}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : s.status === 'TRIALING'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 text-[11px] font-mono">
                      {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-slate-500 text-[11px] font-mono">
                      {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 text-[11px] font-normal text-slate-600 dark:text-slate-400">
                      {s.cancel_at_period_end ? 'Yes (Pending cancel)' : 'No (Auto-renew)'}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={deletingId === s.id}
                        onClick={() => handleDelete(s.id)}
                        className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
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

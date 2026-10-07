'use client';

import { useState, useEffect, useMemo } from 'react';
import SubscriptionForm from 'src/component/marketing/developer/forms/SubscriptionForm';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PAID', 'UNPAID'
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/subscriptions');
      const data = await res.json();
      if (data.success) {
        setSubs(data.records || data.subscriptions || []);
      }
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const showNotification = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDelete = async (id, creatorEmail) => {
    if (!confirm(`Are you sure you want to delete subscription #${id} for ${creatorEmail || 'creator'}? Associated invoices will also be removed.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/subscriptions?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Subscription #${id} deleted.`);
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

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(s.id).includes(q) ||
        String(s.creator_id).includes(q) ||
        s.creator_name?.toLowerCase().includes(q) ||
        s.creator_email?.toLowerCase().includes(q) ||
        s.package_name?.toLowerCase().includes(q) ||
        s.purchase_code?.toLowerCase().includes(q) ||
        s.transaction_id?.toLowerCase().includes(q);

      const isPaid = s.payment_status === 'successful' || s.purchase_status === 'completed' || s.subscription_status === 'active';
      const isUnpaid = s.payment_status === 'pending' || s.purchase_status === 'pending' || s.subscription_status === 'past_due';

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && isPaid) ||
        (statusFilter === 'UNPAID' && isUnpaid);

      return matchesSearch && matchesStatus;
    });
  }, [subs, searchTerm, statusFilter]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Creator Subscriptions &amp; Billing Grants
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Subscriptions
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create custom subscription tiers, assign packages by creator email, and manage paid grants or unpaid invoices.
          </p>
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
            {showForm ? 'Hide Form' : 'New Subscription'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded border border-slate-200 bg-slate-50 text-slate-800 text-xs font-medium">
          {feedback}
        </div>
      )}

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
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by email, creator name, package, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                All ({subs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PAID')}
                className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer transition-colors ${
                  statusFilter === 'PAID'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Paid / Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer transition-colors ${
                  statusFilter === 'UNPAID'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Unpaid / Invoices
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {subs.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">Order ID</th>
                <th className="pb-2 whitespace-nowrap">Creator</th>
                <th className="pb-2 whitespace-nowrap">Plan Tier</th>
                <th className="pb-2 whitespace-nowrap">Duration &amp; Term</th>
                <th className="pb-2 whitespace-nowrap">Amount</th>
                <th className="pb-2 whitespace-nowrap">Payment State</th>
                <th className="pb-2 whitespace-nowrap">Subscription</th>
                <th className="pb-2 whitespace-nowrap">Active Range</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading subscriptions ledger..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No subscriptions found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isPaid = s.payment_status === 'successful' || s.purchase_status === 'completed';
                  const isPending = s.payment_status === 'pending' || s.purchase_status === 'pending';
                  const isSubActive = s.subscription_status === 'active';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 font-mono font-medium text-slate-400">
                        #{s.id}
                        {s.purchase_code && (
                          <div className="text-[10px] text-slate-500 font-mono">{s.purchase_code}</div>
                        )}
                      </td>

                      <td className="py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {s.creator_name || `Creator #${s.creator_id}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {s.creator_email || `ID: ${s.creator_id}`}
                        </div>
                        {s.creator_institution && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {s.creator_institution}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {s.package_name || `Package #${s.package_id}`}
                          </span>
                          {s.package_is_public === false ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200">
                              Custom
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              Public
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5">
                        <span className="capitalize text-slate-800 dark:text-slate-200 font-medium">
                          {s.billing_cycle || 'Monthly'}
                        </span>
                      </td>

                      <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                        {s.payment_currency === 'BDT' ? '৳' : '$'}
                        {Number(s.total_amount || s.payment_amount || 0).toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {s.payment_currency || 'USD'}
                        </span>
                      </td>

                      <td className="py-2.5">
                        {isPaid ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid &bull; {s.payment_method || 'Grant'}
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Unpaid Invoice (In Panel)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {s.payment_status || 'Pending'}
                          </span>
                        )}
                        {s.transaction_id && (
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                            Txn: {s.transaction_id}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                            isSubActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : s.subscription_status === 'past_due'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {s.subscription_status || 'active'}
                        </span>
                      </td>

                      <td className="py-2.5 text-slate-500 text-[11px] font-mono">
                        <div>
                          {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString() : '—'}
                          {' '}&rarr;{' '}
                          {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
                        </div>
                      </td>

                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id, s.creator_email)}
                          className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                        >
                          {deletingId === s.id ? 'Deleting...' : 'Delete'}
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
    </div>
  );
}

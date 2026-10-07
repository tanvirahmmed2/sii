'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/purchases');
      const data = await res.json();
      if (data.success) {
        setPurchases(data.records || []);
      }
    } catch (e) {
      console.error('Failed to fetch purchases:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch('/api/marketing/developer/purchases')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setPurchases(data.records || []);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!editingPurchase || !editStatus) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/marketing/developer/purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPurchase.id,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Purchase #${editingPurchase.id} updated to ${editStatus}`);
        setEditingPurchase(null);
        fetchPurchases();
        setTimeout(() => setToastMessage(''), 4000);
      } else {
        alert(data.error || 'Failed to update purchase status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Are you sure you want to permanently delete purchase order #${id}?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/purchases?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Purchase #${id} deleted.`);
        fetchPurchases();
        setTimeout(() => setToastMessage(''), 4000);
      } else {
        alert(data.error || 'Failed to delete purchase.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = purchases.filter((pu) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(pu.id).includes(q) ||
      pu.creator_name?.toLowerCase().includes(q) ||
      pu.creator_email?.toLowerCase().includes(q) ||
      pu.package_name?.toLowerCase().includes(q) ||
      pu.transaction_id?.toLowerCase().includes(q) ||
      pu.status?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      pu.status?.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  let totalUsd = 0;
  let totalBdt = 0;
  purchases.forEach((pu) => {
    const curr = String(pu.currency || 'USD').toUpperCase();
    const amountVal =
      pu.amount_in_cents !== undefined
        ? Number(pu.amount_in_cents) / 100
        : pu.total_amount !== undefined
        ? Number(pu.total_amount)
        : pu.price !== undefined
        ? Number(pu.price)
        : 0;
    if (curr === 'BDT') totalBdt += amountVal;
    else totalUsd += amountVal;
  });

  const completedCount = purchases.filter((pu) => ['completed', 'active'].includes(String(pu.status || '').toLowerCase())).length;
  const unpaidCount = purchases.filter((pu) => ['unpaid', 'pending'].includes(String(pu.status || '').toLowerCase())).length;

  return (
    <div className="w-full space-y-4">
      {toastMessage && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-normal flex items-center justify-between">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')} className="text-emerald-700 hover:underline text-xs font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Platform Purchases</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Purchases
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All package orders placed by creators, tracking payment link status and subscription activation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPurchases}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
          <Link
            href="/developer/payments"
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium transition-colors"
          >
            Manage Payments
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Total Orders</span>
          <div className="text-base font-semibold text-slate-900 dark:text-white">{purchases.length}</div>
          <p className="text-[11px] text-slate-500">
            Total volume: {totalUsd > 0 && totalBdt > 0 ? `$${totalUsd.toFixed(2)} USD / ৳${totalBdt.toLocaleString()} BDT` : totalBdt > 0 ? `৳${totalBdt.toLocaleString()} BDT` : `$${totalUsd.toFixed(2)} USD`}
          </p>
        </div>
        <div className="p-3.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Completed Purchases</span>
          <div className="text-base font-semibold text-emerald-700 dark:text-emerald-400">{completedCount}</div>
          <p className="text-[11px] text-slate-400">Active and delivered orders</p>
        </div>
        <div className="p-3.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Awaiting Payment</span>
          <div className="text-base font-semibold text-amber-700 dark:text-amber-400">{unpaidCount}</div>
          <p className="text-[11px] text-slate-400">Unpaid invoices pending settlement</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search orders, creator, package..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs">
              {['ALL', 'UNPAID', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-normal'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {purchases.length} orders
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">Order ID</th>
                <th className="pb-2 whitespace-nowrap">Creator</th>
                <th className="pb-2 whitespace-nowrap">Package Plan</th>
                <th className="pb-2 whitespace-nowrap">Amount</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Linked Payment</th>
                <th className="pb-2 whitespace-nowrap">Created Date</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading platform purchases..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No purchase orders found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((pu) => {
                  const amount = (Number(pu.amount_in_cents || pu.price * 100 || 0) / 100).toFixed(2);
                  const curr = String(pu.currency || 'USD').toUpperCase();
                  const sym = curr === 'BDT' ? '৳' : '$';

                  const s = String(pu.status || '').toLowerCase();
                  const isComp = s === 'completed' || s === 'active';
                  const isPend = s === 'pending' || s === 'unpaid';

                  return (
                    <tr key={pu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 font-mono font-medium text-slate-400">#{pu.id}</td>

                      <td className="py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{pu.creator_name || `Creator #${pu.creator_id}`}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{pu.creator_email || `ID: ${pu.creator_id}`}</div>
                      </td>

                      <td className="py-2.5">
                        <div className="font-normal text-slate-800 dark:text-slate-200">
                          {pu.package_name || `Package #${pu.package_id}`}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">
                          {pu.billing_interval || 'Monthly'}
                        </span>
                      </td>

                      <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                        {sym}{amount} {curr}
                      </td>

                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium uppercase ${
                            isComp
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isPend
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {pu.status}
                        </span>
                      </td>

                      <td className="py-2.5">
                        {pu.payment_id ? (
                          <Link
                            href="/developer/payments"
                            className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 hover:underline"
                          >
                            <span>Payment #{pu.payment_id}</span>
                            {pu.payment_status && (
                              <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {pu.payment_status}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unlinked</span>
                        )}
                      </td>

                      <td className="py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {pu.created_at ? new Date(pu.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPurchase(pu);
                              setEditStatus(pu.status || 'UNPAID');
                            }}
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                            title="Edit order status"
                          >
                            Status
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === pu.id}
                            onClick={() => handleDelete(pu.id)}
                            className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                            title="Delete order"
                          >
                            Delete
                          </button>
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

      {/* Edit Purchase Status Modal */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded p-4 max-w-md w-full shadow-lg space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Update Purchase Status</h3>
                <p className="text-xs text-slate-500">Order #{editingPurchase.id} • Creator #{editingPurchase.creator_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPurchase(null)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 rounded border border-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import PaymentForm from 'src/component/marketing/developer/forms/PaymentForm';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/payments');
      const data = await res.json();
      if (data.success) {
        setPayments(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch('/api/marketing/developer/payments')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setPayments(data.records || []);
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

  // Quick Action: Mark as Paid & Activate Subscription
  const handleMarkAsPaid = async (payment) => {
    if (!confirm(`Mark payment #${payment.id} as PAID? This will automatically provision and activate a subscription for Creator #${payment.creator_id}.`)) {
      return;
    }

    setUpdatingId(payment.id);
    try {
      const res = await fetch('/api/marketing/developer/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payment.id,
          status: 'COMPLETED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Payment #${payment.id} marked as PAID & subscription activated successfully!`);
        fetchPayments();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        alert(data.error || 'Failed to update payment status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error marking payment as paid.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Modal Status Update
  const handleSaveModalStatus = async (e) => {
    e.preventDefault();
    if (!editingPayment || !editStatus) return;

    setUpdatingId(editingPayment.id);
    try {
      const res = await fetch('/api/marketing/developer/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPayment.id,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Payment #${editingPayment.id} status updated to ${editStatus}.`);
        setEditingPayment(null);
        fetchPayments();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        alert(data.error || 'Failed to update payment status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating payment status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/marketing/developer/payments?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Payment #${id} deleted.`);
        fetchPayments();
        setTimeout(() => setToastMessage(''), 4000);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = payments.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(p.id).includes(q) ||
      p.transaction_id?.toLowerCase().includes(q) ||
      String(p.creator_id).includes(q) ||
      p.creator_name?.toLowerCase().includes(q) ||
      p.creator_email?.toLowerCase().includes(q) ||
      p.package_name?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      p.status?.toUpperCase() === statusFilter.toUpperCase() ||
      (statusFilter.toUpperCase() === 'COMPLETED' && (p.status?.toLowerCase() === 'successful' || p.status?.toLowerCase() === 'completed')) ||
      (statusFilter.toUpperCase() === 'PENDING' && (p.status?.toLowerCase() === 'pending' || p.status?.toLowerCase() === 'unpaid'));

    return matchesSearch && matchesStatus;
  });

  const unpaidCount = payments.filter((p) => p.status === 'UNPAID' || p.status === 'PENDING' || p.status === 'pending').length;
  const completedCount = payments.filter((p) => p.status === 'COMPLETED' || p.status === 'successful' || p.status === 'SUCCESSFUL').length;

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
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Payment Transactions</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Payments
            </span>
            {unpaidCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                {unpaidCount} Awaiting Settlement
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Financial transactions, Paddle &amp; bKash checkout settlements, and subscription activation management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPayments}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
          >
            Refresh
          </button>
          <Link
            href="/developer/purchases"
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium"
          >
            View Purchases
          </Link>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              showForm
                ? 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
            }`}
          >
            {showForm ? 'Hide Form' : 'Add Payment'}
          </button>
        </div>
      </div>

      {showForm && (
        <PaymentForm
          apiEndpoint="/api/marketing/developer/payments"
          onSuccess={() => {
            setShowForm(false);
            fetchPayments();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by txn ID, creator, package..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs">
              {['ALL', 'UNPAID', 'PENDING', 'COMPLETED', 'FAILED'].map((st) => (
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
            Showing {filtered.length} of {payments.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="pb-2 whitespace-nowrap">ID</th>
                <th className="pb-2 whitespace-nowrap">Transaction ID</th>
                <th className="pb-2 whitespace-nowrap">Creator</th>
                <th className="pb-2 whitespace-nowrap">Package Plan</th>
                <th className="pb-2 whitespace-nowrap">Amount</th>
                <th className="pb-2 whitespace-nowrap">Method</th>
                <th className="pb-2 whitespace-nowrap">Status</th>
                <th className="pb-2 whitespace-nowrap">Subscription</th>
                <th className="pb-2 whitespace-nowrap">Date</th>
                <th className="pb-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-normal">
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-normal">
                    No payment transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isUnpaid = p.status === 'UNPAID' || p.status === 'PENDING' || p.status === 'pending';
                  const isCompleted = p.status === 'COMPLETED' || p.status === 'successful' || p.status === 'SUCCESSFUL';
                  const numAmount = Number(p.amount !== undefined ? p.amount : (Number(p.amount_in_cents || 0) / 100));
                  const curr = String(p.currency || (p.payment_method === 'bkash' || p.gateway === 'bkash' ? 'BDT' : 'USD')).toUpperCase();
                  const sym = curr === 'BDT' ? '৳' : '$';
                  const formattedAmount = `${sym}${numAmount.toFixed(2)} ${curr}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 font-mono font-medium text-slate-400">#{p.id}</td>

                      <td className="py-2.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {p.transaction_id || p.id}
                      </td>

                      <td className="py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{p.creator_name || `Creator #${p.creator_id}`}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{p.creator_email || `ID: ${p.creator_id}`}</div>
                      </td>

                      <td className="py-2.5">
                        <div className="font-normal text-slate-800 dark:text-slate-200">
                          {p.package_name || (p.package_id ? `Package #${p.package_id}` : 'General Payment')}
                        </div>
                        {p.billing_interval && (
                          <span className="text-[10px] text-slate-400 uppercase font-medium">{p.billing_interval}</span>
                        )}
                      </td>

                      <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                        {formattedAmount}
                      </td>

                      <td className="py-2.5 text-slate-600 dark:text-slate-400 text-xs font-normal">{p.payment_method}</td>

                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isUnpaid
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-2.5">
                        {p.subscription_id ? (
                          <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            Sub #{p.subscription_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>

                      <td className="py-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isUnpaid && (
                            <button
                              type="button"
                              disabled={updatingId === p.id}
                              onClick={() => handleMarkAsPaid(p)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                              title="Mark as paid and activate package subscription"
                            >
                              Make Paid
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayment(p);
                              setEditStatus(p.status || 'UNPAID');
                            }}
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                            title="Update status"
                          >
                            Status
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === p.id}
                            onClick={() => handleDelete(p.id)}
                            className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                            title="Delete record"
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

      {/* Edit Status Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded p-4 max-w-md w-full shadow-lg space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Update Payment Status</h3>
                <p className="text-xs text-slate-500">Invoice #{editingPayment.id} • Creator #{editingPayment.creator_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 rounded border border-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveModalStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                >
                  <option value="UNPAID">UNPAID (Pending Customer Payment)</option>
                  <option value="PENDING">PENDING (Processing)</option>
                  <option value="COMPLETED">COMPLETED (Paid &amp; Activate Subscription)</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              {editStatus === 'COMPLETED' && !editingPayment.subscription_id && (
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
                  Notice: Setting status to COMPLETED will automatically generate and activate the creator&apos;s subscription.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === editingPayment.id}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-colors disabled:opacity-50"
                >
                  {updatingId === editingPayment.id ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

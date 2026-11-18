'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import PaymentForm from 'src/component/marketing/developer/forms/PaymentForm';
import LoadingScreen from 'src/component/common/LoadingScreen';

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
  const [editNotes, setEditNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [confirmPaidTarget, setConfirmPaidTarget] = useState(null);
  const [confirmPaidNotes, setConfirmPaidNotes] = useState('');
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marketing/developer/payments');
      const data = await res.json();
      if (data.success) {
        setPayments(data.records || []);
      }
    } catch {
      setErrorMessage('Failed to load payment transactions');
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
      .catch(() => {
        if (!ignore) setErrorMessage('Failed to load payment transactions');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleExecuteMarkAsPaid = async (e) => {
    if (e) e.preventDefault();
    if (!confirmPaidTarget) return;

    setUpdatingId(confirmPaidTarget.id);
    setErrorMessage('');
    try {
      const res = await fetch('/api/marketing/developer/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: confirmPaidTarget.id,
          status: 'COMPLETED',
          manual_payment_notes: confirmPaidNotes || 'Manual payment approved and settled by developer',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Payment #${confirmPaidTarget.id} marked as PAID & subscription activated successfully.`);
        setConfirmPaidTarget(null);
        setConfirmPaidNotes('');
        fetchPayments();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to update payment status.');
      }
    } catch {
      setErrorMessage('Error marking payment as paid.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveModalStatus = async (e) => {
    e.preventDefault();
    if (!editingPayment || !editStatus) return;

    setUpdatingId(editingPayment.id);
    setErrorMessage('');
    try {
      const res = await fetch('/api/marketing/developer/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPayment.id,
          status: editStatus,
          manual_payment_notes: editNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Payment #${editingPayment.id} status updated to ${editStatus}.`);
        setEditingPayment(null);
        fetchPayments();
        setTimeout(() => setToastMessage(''), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to update payment status.');
      }
    } catch {
      setErrorMessage('Error updating payment status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDeleteTarget) return;
    const id = confirmDeleteTarget.id;
    setDeletingId(id);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/marketing/developer/payments?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Payment #${id} deleted.`);
        setConfirmDeleteTarget(null);
        fetchPayments();
        setTimeout(() => setToastMessage(''), 4000);
      } else if (data.error) {
        setErrorMessage(data.error);
      }
    } catch {
      setErrorMessage('Error deleting payment transaction.');
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
      p.status?.toLowerCase().includes(q) ||
      p.developer_name?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      p.status?.toUpperCase() === statusFilter.toUpperCase() ||
      (statusFilter.toUpperCase() === 'COMPLETED' && (p.status?.toLowerCase() === 'successful' || p.status?.toLowerCase() === 'completed')) ||
      (statusFilter.toUpperCase() === 'PENDING' && (p.status?.toLowerCase() === 'pending' || p.status?.toLowerCase() === 'unpaid'));

    return matchesSearch && matchesStatus;
  });

  const unpaidCount = payments.filter((p) => p.status === 'UNPAID' || p.status === 'PENDING' || p.status === 'pending').length;

  return (
    <div className="w-full space-y-4 text-xs">
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span className="font-medium">{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')} className="text-emerald-700 hover:underline font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span className="font-medium">{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')} className="text-rose-700 hover:underline font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-slate-900 dark:text-white">Platform Payment Management</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              EPS &amp; Manual
            </span>
            {unpaidCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300">
                {unpaidCount} Awaiting Settlement
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor central EPS transactions, collect developer manual payments, and manage instant subscription provisioning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPayments}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            Refresh
          </button>
          <Link
            href="/developer/purchases"
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
          >
            View Purchases
          </Link>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
              showForm
                ? 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            {showForm ? 'Hide Form' : 'Take Manual Payment'}
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-80">
              <input
                type="text"
                aria-label="Filter payments by transaction ID, creator, or plan"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-600"
              />
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-xs">
              {['ALL', 'UNPAID', 'PENDING', 'COMPLETED', 'FAILED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
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
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3 whitespace-nowrap">ID</th>
                <th className="pb-3 whitespace-nowrap">Transaction ID</th>
                <th className="pb-3 whitespace-nowrap">Creator</th>
                <th className="pb-3 whitespace-nowrap">Package Plan</th>
                <th className="pb-3 whitespace-nowrap">Amount</th>
                <th className="pb-3 whitespace-nowrap">Gateway / Method</th>
                <th className="pb-3 whitespace-nowrap">Status</th>
                <th className="pb-3 whitespace-nowrap">Processed By</th>
                <th className="pb-3 whitespace-nowrap">Date</th>
                <th className="pb-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <LoadingScreen fullScreen={false} size="sm" label="Loading payments..." />
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
                  const curr = String(p.currency || 'BDT').toUpperCase();
                  const sym = curr === 'BDT' ? '৳' : '$';
                  const formattedAmount = `${sym}${numAmount.toFixed(2)} ${curr}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono font-bold text-slate-400">#{p.id}</td>

                      <td className="py-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {p.transaction_id || p.id}
                      </td>

                      <td className="py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{p.creator_name || `Creator #${p.creator_id}`}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{p.creator_email || `ID: ${p.creator_id}`}</div>
                      </td>

                      <td className="py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {p.package_name || (p.package_id ? `Package #${p.package_id}` : 'General Payment')}
                        </div>
                        {p.billing_interval && (
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">{p.billing_interval}</span>
                        )}
                      </td>

                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {formattedAmount}
                      </td>

                      <td className="py-3">
                        <span className="font-mono text-xs">{p.payment_gateway || p.payment_method}</span>
                      </td>

                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400'
                            : isUnpaid
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3">
                        {p.developer_name ? (
                          <div>
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">{p.developer_name}</span>
                            <span className="block text-[10px] text-slate-400">Developer</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">System Online</span>
                        )}
                      </td>

                      <td className="py-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isUnpaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmPaidTarget(p);
                                setConfirmPaidNotes(`Approved & verified manual payment by developer`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                            >
                              Make Paid
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayment(p);
                              setEditStatus(p.status || 'UNPAID');
                              setEditNotes(p.manual_payment_notes || '');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
                          >
                            Status
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTarget(p)}
                            className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 text-xs font-medium transition cursor-pointer"
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

      {confirmPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Manual Payment Collection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Marking Payment #{confirmPaidTarget.id} for Creator #{confirmPaidTarget.creator_id} as paid will immediately activate their subscription in the database.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manual Payment Notes / Settlement Reference
              </label>
              <textarea
                rows={3}
                value={confirmPaidNotes}
                onChange={(e) => setConfirmPaidNotes(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmPaidTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingId === confirmPaidTarget.id}
                onClick={handleExecuteMarkAsPaid}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 cursor-pointer shadow-md"
              >
                {updatingId === confirmPaidTarget.id ? 'Activating...' : 'Confirm Paid & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Payment Record</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete Payment #{confirmDeleteTarget.id}? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === confirmDeleteTarget.id}
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50 cursor-pointer shadow-md"
              >
                {deletingId === confirmDeleteTarget.id ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Update Payment Status</h3>
                <p className="text-xs text-slate-500">Invoice #{editingPayment.id} • Creator #{editingPayment.creator_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveModalStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="UNPAID">UNPAID (Pending Customer Payment)</option>
                  <option value="PENDING">PENDING (Processing)</option>
                  <option value="COMPLETED">COMPLETED (Paid &amp; Activate Subscription)</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Manual Payment Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              {editStatus === 'COMPLETED' && !editingPayment.subscription_id && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
                  Notice: Setting status to COMPLETED will automatically generate and activate the creator&apos;s subscription.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === editingPayment.id}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50 cursor-pointer shadow-md"
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

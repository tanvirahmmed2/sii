'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiSearch,
  BiPlus,
  BiMinus,
  BiTrash,
  BiRefresh,
  BiCheckCircle,
  BiTime,
  BiXCircle,
  BiEdit,
  BiX,
  BiLoaderAlt,
  BiCube,
  BiReceipt,
  BiShieldQuarter,
} from 'react-icons/bi';
import PaymentForm from '@/component/marketing/developer/forms/PaymentForm';

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
      const res = await fetch('/api/developer/payments');
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
    fetch('/api/developer/payments')
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
      const res = await fetch('/api/developer/payments', {
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
      const res = await fetch('/api/developer/payments', {
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
      const res = await fetch(`/api/developer/payments?id=${id}`, {
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
      p.status?.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const unpaidCount = payments.filter((p) => p.status === 'UNPAID' || p.status === 'PENDING').length;
  const completedCount = payments.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')} className="text-emerald-500 hover:text-emerald-800">
            <BiX className="text-base" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Transactions</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Payments
            </span>
            {unpaidCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {unpaidCount} Awaiting Settlement
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Financial transactions, Payoneer checkout settlements, and subscription activation management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPayments}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh table data"
          >
            <BiRefresh className="text-lg" />
          </button>
          <Link
            href="/developer/purchases"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all shadow-xs"
          >
            <BiReceipt className="text-base" />
            <span>View Purchases</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              showForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-secondary hover:bg-secondary-dark text-white'
            }`}
          >
            {showForm ? <BiMinus className="text-base" /> : <BiPlus className="text-base" />}
            <span>{showForm ? 'Hide Form' : 'Add Payment'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <PaymentForm
          apiEndpoint="/api/developer/payments"
          onSuccess={() => {
            setShowForm(false);
            fetchPayments();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Search by txn ID, creator, package..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs">
              {['ALL', 'UNPAID', 'PENDING', 'COMPLETED', 'FAILED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-secondary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {payments.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Transaction ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Creator</th>
                <th className="px-4 py-3 whitespace-nowrap">Package Plan</th>
                <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 whitespace-nowrap">Method</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Subscription</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <BiLoaderAlt className="animate-spin text-2xl text-secondary mx-auto mb-2" />
                    <span>Loading payments...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">No payment transactions found.</td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isUnpaid = p.status === 'UNPAID' || p.status === 'PENDING';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">#{p.id}</td>

                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {p.transaction_id || `TXN_${p.id}`}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{p.creator_name || `Creator #${p.creator_id}`}</div>
                        <div className="text-[11px] text-slate-400">{p.creator_email || `ID: ${p.creator_id}`}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <BiCube className="text-secondary text-sm shrink-0" />
                          <span>{p.package_name || (p.package_id ? `Package #${p.package_id}` : 'General Payment')}</span>
                        </div>
                        {p.billing_interval && (
                          <span className="text-[10px] text-slate-400 uppercase font-medium">{p.billing_interval}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                        ${((p.amount_in_cents || 0) / 100).toFixed(2)} {p.currency || 'USD'}
                      </td>

                      <td className="px-4 py-3 text-slate-600 text-[11px] font-semibold">{p.payment_method}</td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'PENDING' || p.status === 'UNPAID'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {p.status === 'COMPLETED' && <BiCheckCircle />}
                          {(p.status === 'PENDING' || p.status === 'UNPAID') && <BiTime />}
                          {p.status !== 'COMPLETED' && p.status !== 'PENDING' && p.status !== 'UNPAID' && <BiXCircle />}
                          <span>{p.status}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {p.subscription_id ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <BiCheckCircle />
                            <span>Sub #{p.subscription_id}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not created</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Allowed role action: If unpaid, make it paid and create subscription */}
                          {isUnpaid && (
                            <button
                              type="button"
                              disabled={updatingId === p.id}
                              onClick={() => handleMarkAsPaid(p)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Mark as paid and activate package subscription"
                            >
                              {updatingId === p.id ? (
                                <BiLoaderAlt className="animate-spin text-xs" />
                              ) : (
                                <BiCheckCircle className="text-xs" />
                              )}
                              <span>Make Paid</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayment(p);
                              setEditStatus(p.status || 'UNPAID');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-secondary hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Update status"
                          >
                            <BiEdit className="text-base" />
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === p.id}
                            onClick={() => handleDelete(p.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete record"
                          >
                            <BiTrash className="text-base" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Payment Status</h3>
                <p className="text-xs text-slate-500">Invoice #{editingPayment.id} • Creator #{editingPayment.creator_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSaveModalStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-secondary"
                >
                  <option value="UNPAID">UNPAID (Pending Customer Payment)</option>
                  <option value="PENDING">PENDING (Processing)</option>
                  <option value="COMPLETED">COMPLETED (Paid & Activate Subscription)</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              {editStatus === 'COMPLETED' && !editingPayment.subscription_id && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                  Notice: Setting status to <strong>COMPLETED</strong> will automatically generate and activate the creator&apos;s subscription.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === editingPayment.id}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary-dark text-white transition-all shadow-xs disabled:opacity-50"
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

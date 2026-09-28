'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiSearch,
  BiRefresh,
  BiTrash,
  BiEdit,
  BiReceipt,
  BiCreditCard,
  BiCube,
  BiUser,
  BiCheckCircle,
  BiXCircle,
  BiTime,
  BiX,
  BiLoaderAlt,
} from 'react-icons/bi';

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
      const res = await fetch('/api/developer/purchases');
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
    fetch('/api/developer/purchases')
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
      const res = await fetch('/api/developer/purchases', {
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
      const res = await fetch(`/api/developer/purchases?id=${id}`, {
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

  const totalAmount = purchases.reduce((acc, pu) => acc + (Number(pu.amount_in_cents || pu.price * 100 || 0) / 100), 0);
  const completedCount = purchases.filter((pu) => pu.status === 'COMPLETED').length;
  const unpaidCount = purchases.filter((pu) => pu.status === 'UNPAID' || pu.status === 'PENDING').length;

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Purchases</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              Purchases
            </span>
          </div>
          <p className="text-xs text-slate-500">
            All package orders placed by creators, tracking payment link status and subscription activation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPurchases}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh purchases"
          >
            <BiRefresh className="text-lg" />
          </button>
          <Link
            href="/developer/payments"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs"
          >
            <BiCreditCard className="text-base" />
            <span>Manage Payments</span>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
          <div className="text-2xl font-bold text-slate-900">{purchases.length}</div>
          <p className="text-[11px] text-slate-400">Total volume: ${totalAmount.toFixed(2)} USD</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed Purchases</span>
          <div className="text-2xl font-bold text-emerald-700">{completedCount}</div>
          <p className="text-[11px] text-slate-400">Active and delivered orders</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Awaiting Payment</span>
          <div className="text-2xl font-bold text-amber-700">{unpaidCount}</div>
          <p className="text-[11px] text-slate-400">Unpaid invoices pending settlement</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Search orders, creator, package..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs">
              {['ALL', 'UNPAID', 'COMPLETED', 'CANCELLED'].map((st) => (
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
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {purchases.length} orders
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 whitespace-nowrap">Order ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Creator</th>
                <th className="px-4 py-3 whitespace-nowrap">Package Plan</th>
                <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Linked Payment</th>
                <th className="px-4 py-3 whitespace-nowrap">Created Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <BiLoaderAlt className="animate-spin text-2xl text-secondary mx-auto mb-2" />
                    <span>Loading platform purchases...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No purchase orders found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((pu) => {
                  const amount = (Number(pu.amount_in_cents || pu.price * 100 || 0) / 100).toFixed(2);
                  return (
                    <tr key={pu.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">#{pu.id}</td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{pu.creator_name || `Creator #${pu.creator_id}`}</div>
                        <div className="text-[11px] text-slate-400">{pu.creator_email || `ID: ${pu.creator_id}`}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <BiCube className="text-secondary text-sm shrink-0" />
                          <span>{pu.package_name || `Package #${pu.package_id}`}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">
                          {pu.billing_interval || 'Monthly'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                        ${amount} <span className="text-[10px] font-normal text-slate-400">{pu.currency || 'USD'}</span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            pu.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : pu.status === 'UNPAID' || pu.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {pu.status === 'COMPLETED' && <BiCheckCircle />}
                          {(pu.status === 'UNPAID' || pu.status === 'PENDING') && <BiTime />}
                          {pu.status !== 'COMPLETED' && pu.status !== 'UNPAID' && pu.status !== 'PENDING' && <BiXCircle />}
                          <span>{pu.status}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {pu.payment_id ? (
                          <Link
                            href={`/developer/payments`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:underline"
                          >
                            <BiCreditCard />
                            <span>Payment #{pu.payment_id}</span>
                            {pu.payment_status && (
                              <span className="text-[9px] px-1.5 rounded-md bg-slate-100 text-slate-600">
                                {pu.payment_status}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unlinked</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {pu.created_at ? new Date(pu.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPurchase(pu);
                              setEditStatus(pu.status || 'UNPAID');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-secondary hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit order status"
                          >
                            <BiEdit className="text-base" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === pu.id}
                            onClick={() => handleDelete(pu.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete order"
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

      {/* Edit Purchase Status Modal */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Purchase Status</h3>
                <p className="text-xs text-slate-500">Order #{editingPurchase.id} • Creator #{editingPurchase.creator_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPurchase(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-secondary"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary-dark text-white transition-all shadow-xs disabled:opacity-50"
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

'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Context } from 'src/component/helper/Context';
import LoadingScreen from 'src/component/common/LoadingScreen';
import {
  FiCreditCard,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiUsers,
  FiExternalLink
} from 'react-icons/fi';

export default function DeveloperPayrollPaymentsPage() {
  const { user } = useContext(Context);
  const searchParams = useSearchParams();
  const initialAllocationId = searchParams.get('allocation_id') || '';

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = Boolean(
    permissions.includes('payroll') ||
    permissions.includes('*') ||
    Number(user?.id) === 1 ||
    String(user?.email).toLowerCase() === 'tanvir004006@gmail.com'
  );

  const [payments, setPayments] = useState([]);
  const [pendingAllocations, setPendingAllocations] = useState([]);
  const [stats, setStats] = useState({
    total_disbursed: 0,
    paid_developers_count: 0,
    total_payment_records: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [showPayPanel, setShowPayPanel] = useState(Boolean(initialAllocationId));
  const [payForm, setPayForm] = useState({
    developer_payroll_id: initialAllocationId,
    amount: '',
    payment_method: 'BANK_TRANSFER',
    transaction_reference: '',
    notes: '',
    receipt_url: '',
  });

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/marketing/developer/payroll/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setPendingAllocations(data.pendingAllocations || []);
        setStats(data.stats || {
          total_disbursed: 0,
          paid_developers_count: 0,
          total_payment_records: 0,
        });

        if (initialAllocationId && data.pendingAllocations) {
          const match = data.pendingAllocations.find((a) => String(a.id) === String(initialAllocationId));
          if (match) {
            setPayForm((prev) => ({
              ...prev,
              developer_payroll_id: String(match.id),
              amount: match.net_salary,
              payment_method: match.payment_method || 'BANK_TRANSFER',
            }));
            setShowPayPanel(true);
          }
        }
      } else {
        showToastMsg(data.error || 'Failed to load payments.', 'error');
      }
    } catch (err) {
      showToastMsg('Network connection error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleSelectAllocation = (allocId) => {
    const match = pendingAllocations.find((a) => String(a.id) === String(allocId));
    if (match) {
      setPayForm({
        ...payForm,
        developer_payroll_id: String(match.id),
        amount: match.net_salary,
        payment_method: match.payment_method || 'BANK_TRANSFER',
      });
    } else {
      setPayForm({
        ...payForm,
        developer_payroll_id: allocId,
      });
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payForm.developer_payroll_id || payForm.amount === '') {
      showToastMsg('Please choose an allocation and enter payment amount.', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/marketing/developer/payroll/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payForm),
      });
      const data = await res.json();

      if (data.success) {
        showToastMsg('Disbursement recorded successfully.');
        setShowPayPanel(false);
        setPayForm({
          developer_payroll_id: '',
          amount: '',
          payment_method: 'BANK_TRANSFER',
          transaction_reference: '',
          notes: '',
          receipt_url: '',
        });
        fetchPayments();
      } else {
        showToastMsg(data.error || 'Payment recording failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error while processing payment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPayment = async (id) => {
    if (!window.confirm('Cancel and reverse this payment record? This will mark the developer allocation as UNPAID.')) return;
    try {
      const res = await fetch(`/api/marketing/developer/payroll/payments?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Payment record reversed.');
        fetchPayments();
      } else {
        showToastMsg(data.error || 'Reversal failed.', 'error');
      }
    } catch (err) {
      showToastMsg('Network error.', 'error');
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(p.developer_name || '').toLowerCase().includes(q) ||
      String(p.developer_email || '').toLowerCase().includes(q) ||
      String(p.transaction_reference || '').toLowerCase().includes(q) ||
      String(p.payroll_title || '').toLowerCase().includes(q)
    );
  });

  if (loading && payments.length === 0) {
    return <LoadingScreen message="Loading payroll payments and transactions..." />;
  }

  return (
    <div className="w-full space-y-5">
      {toast && (
        <div
          className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
          }`}
        >
          <span>{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-white tracking-tight">
            Payroll Payment Disbursements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit salary disbursement transactions, payment references, and payment proofs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPayments}
            className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FiRefreshCw className="text-xs" />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowPayPanel(!showPayPanel)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FiPlus className="text-xs" />
              <span>{showPayPanel ? 'Close Form' : 'Record Payment'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        <Link
          href="/developer/payroll"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Payroll Runs
        </Link>
        <Link
          href="/developer/payroll/assign"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          Assign to Developer
        </Link>
        <Link
          href="/developer/payroll/payments"
          className="px-3 py-1.5 rounded font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          Payroll Payments
        </Link>
        <Link
          href="/developer/my-salaries"
          className="px-3 py-1.5 rounded font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
        >
          My Salaries
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Total Disbursed</span>
            <FiCheckCircle className="text-emerald-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            ${Number(stats.total_disbursed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Completed payouts</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Paid Developers</span>
            <FiUsers className="text-blue-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {Number(stats.paid_developers_count || 0)}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Staff paid to date</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Total Records</span>
            <FiCreditCard className="text-violet-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {Number(stats.total_payment_records || 0)}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Disbursement vouchers</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-normal">Pending Allocations</span>
            <FiClock className="text-amber-500 text-sm" />
          </div>
          <div className="text-lg font-medium text-slate-900 dark:text-white">
            {pendingAllocations.length}
          </div>
          <span className="text-[11px] text-slate-400 font-normal">Awaiting payment</span>
        </div>
      </div>

      {showPayPanel && (
        <form
          onSubmit={handlePaySubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-white">
                Record Salary Disbursement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record payment transaction reference and mark the developer allocation as paid.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPayPanel(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Unpaid Developer Allocation
              </label>
              <select
                required
                value={payForm.developer_payroll_id}
                onChange={(e) => handleSelectAllocation(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="">Select Pending Allocation</option>
                {pendingAllocations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.developer_name} &bull; {a.payroll_title} &bull; ${Number(a.net_salary).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Payment Amount ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Disbursement Method
              </label>
              <select
                value={payForm.payment_method}
                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="CASH">Cash</option>
                <option value="CRYPTO">Crypto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Transaction Reference / TrxID
              </label>
              <input
                type="text"
                value={payForm.transaction_reference}
                onChange={(e) => setPayForm({ ...payForm, transaction_reference: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Payment Proof / Receipt URL
              </label>
              <input
                type="url"
                value={payForm.receipt_url}
                onChange={(e) => setPayForm({ ...payForm, receipt_url: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Disbursement Notes
              </label>
              <input
                type="text"
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPayPanel(false)}
              className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-normal transition-colors cursor-pointer"
            >
              {saving ? 'Recording...' : 'Confirm & Disburse'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-normal'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal outline-hidden focus:border-slate-400"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-normal">
                <th className="py-2.5 px-3">Transaction / Reference</th>
                <th className="py-2.5 px-3">Developer</th>
                <th className="py-2.5 px-3">Payroll Cycle</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Processed By</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-normal">
                    No payment disbursement records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-white font-mono text-[11px]">
                        {p.transaction_reference}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {new Date(p.payment_date).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {p.developer_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {p.developer_email}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-normal text-slate-900 dark:text-white">{p.payroll_title}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {new Date(p.pay_period_start).toLocaleDateString()} - {new Date(p.pay_period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      ${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-normal whitespace-nowrap">
                      {p.payment_method}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-normal text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.processed_by_name || 'System'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-normal ${
                        p.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                      {p.receipt_url && (
                        <a
                          href={p.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        >
                          <FiExternalLink className="text-xs" />
                        </a>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleCancelPayment(p.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      )}
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


'use client';

import React, { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiPrinter,
  FiCreditCard,
  FiAlertCircle,
  FiRefreshCw,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
} from 'react-icons/fi';
import { printStudentFeeReceipt } from 'src/lib/receipts/student_fee';

export default function PaymentEducationListPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({
    total_records: 0,
    total_billed: '0.00',
    total_collected: '0.00',
    total_pending: '0.00',
    paid_count: 0,
    unpaid_count: 0,
  });
  const [meta, setMeta] = useState({ classes: [], sessions: [] });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Collect Modal State
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [collectData, setCollectData] = useState({
    paid_amount: '',
    payment_method: 'cash',
    transaction_id: '',
    notes: '',
  });
  const [collecting, setCollecting] = useState(false);

  const loadMeta = async () => {
    try {
      const res = await fetch('/api/fees/education/meta');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMeta({
            classes: json.classes || [],
            sessions: json.sessions || [],
          });
        }
      }
    } catch (err) {
      console.error('Error loading meta:', err);
    }
  };

  const loadPayments = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        status: selectedStatus,
        class_id: selectedClass,
        month_name: selectedMonth,
        search,
      });

      const res = await fetch(`/api/fees/education/payments?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPayments(json.data || []);
          setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
          if (json.stats) setStats(json.stats);
        }
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      showFeedback('error', 'Network error loading payment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadPayments(1);
  }, [selectedStatus, selectedClass, selectedMonth]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPayments(1);
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const openCollectModal = (payment) => {
    setSelectedPayment(payment);
    const netDue = parseFloat(payment.amount) + parseFloat(payment.fine_amount || 0) - parseFloat(payment.paid_amount || 0);
    setCollectData({
      paid_amount: netDue > 0 ? netDue.toFixed(2) : '0.00',
      payment_method: 'cash',
      transaction_id: `CASH-${Date.now().toString().slice(-6)}`,
      notes: '',
    });
    setCollectModalOpen(true);
  };

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;

    setCollecting(true);
    try {
      const res = await fetch('/api/fees/education/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: selectedPayment.id,
          paid_amount: collectData.paid_amount,
          payment_method: collectData.payment_method,
          transaction_id: collectData.transaction_id,
          notes: collectData.notes,
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        showFeedback('success', resJson.message || 'Payment recorded successfully!');
        setCollectModalOpen(false);
        loadPayments(pagination.page);
      } else {
        showFeedback('error', resJson.error || 'Failed to record payment.');
      }
    } catch (err) {
      console.error('Error submitting collection:', err);
      showFeedback('error', 'Network error recording payment.');
    } finally {
      setCollecting(false);
    }
  };

  const handleWaiveFee = async (payment) => {
    if (!window.confirm(`Are you sure you want to waive invoice ${payment.invoice_no} for ${payment.student_name}?`)) return;
    try {
      const res = await fetch('/api/fees/education/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: payment.id, action: 'waive' }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        showFeedback('success', resJson.message || 'Fee invoice waived.');
        loadPayments(pagination.page);
      } else {
        showFeedback('error', resJson.error || 'Failed to waive fee.');
      }
    } catch (err) {
      showFeedback('error', 'Network error waiving fee.');
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
            <FiCheck className="text-xs" /> Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60">
            Partial
          </span>
        );
      case 'waived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200">
            Waived
          </span>
        );
      case 'unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60">
            <FiClock className="text-xs" /> Due
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-10">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <FiCheckCircle className="text-emerald-600 text-lg" />
            ) : (
              <FiAlertCircle className="text-rose-600 text-lg" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <FiX />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FiDollarSign /> Student Financial Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Education Fees & Dues Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Unified billing directory of student tuition dues, payments, on-campus collections, and print vouchers.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white font-mono">
              ৳{parseFloat(stats.total_billed || 0).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {stats.total_records} Invoices
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Collected</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ৳{parseFloat(stats.total_collected || 0).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {stats.paid_count} Cleared
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Dues</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              ৳{parseFloat(stats.total_pending || 0).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
              {stats.unpaid_count} Unpaid
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Collection Rate</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {parseFloat(stats.total_billed || 0) > 0
                ? `${((parseFloat(stats.total_collected || 0) / parseFloat(stats.total_billed || 1)) * 100).toFixed(1)}%`
                : '0.0%'}
            </span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
              Settled
            </span>
          </div>
        </div>
      </div>

      {/* Main Ledger Workstation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        {/* Filter Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll, reg, or invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="unpaid">Unpaid / Due</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">All Classes</option>
              {meta.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadPayments(pagination.page)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-medium">Loading fee ledger entries...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <FiDollarSign className="text-3xl text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No student fee entries found</p>
            <p className="text-xs text-slate-400 mt-0.5">Use "Make Due Fees" to generate monthly billing invoices for your classes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice # & Month</th>
                  <th className="py-3 px-4">Student Info</th>
                  <th className="py-3 px-4">Class & Fee Title</th>
                  <th className="py-3 px-4 text-right">Fee Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Net Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {payments.map((p) => {
                  const totalReq = parseFloat(p.amount) + parseFloat(p.fine_amount || 0);
                  const netDue = Math.max(0, totalReq - parseFloat(p.paid_amount || 0));
                  const isPaid = p.payment_status === 'paid';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-900 dark:text-white">
                        <span className="font-bold block">{p.invoice_no}</span>
                        <span className="text-[10px] text-slate-400">{p.month_name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                        <span className="font-bold block">{p.student_name || 'Enrolled Student'}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>Roll: {p.roll_no || '—'}</span>
                          <span>•</span>
                          <span>Reg: {p.registration_no || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                          {p.title}
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          {p.class_name} {p.section_name ? `(${p.section_name})` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-800 dark:text-slate-200 text-right text-xs">
                        ৳{parseFloat(p.amount).toFixed(2)}
                        {parseFloat(p.fine_amount || 0) > 0 && (
                          <span className="text-[10px] text-rose-500 block font-normal">
                            +৳{parseFloat(p.fine_amount).toFixed(2)} fine
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700 dark:text-emerald-400 font-semibold text-right text-xs">
                        ৳{parseFloat(p.paid_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-right text-xs">
                        {netDue > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">৳{netDue.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">৳0.00</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(p.payment_status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && p.payment_status !== 'waived' && (
                            <button
                              onClick={() => openCollectModal(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              title="Collect Payment"
                            >
                              <FiCreditCard className="text-xs" /> Collect
                            </button>
                          )}
                          <button
                            onClick={() =>
                              printStudentFeeReceipt(
                                {
                                  ...p,
                                  type: 'Education Fee',
                                },
                                {
                                  name: p.student_name,
                                  roll_no: p.roll_no,
                                  registration_no: p.registration_no,
                                }
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Print Voucher Receipt"
                          >
                            <FiPrinter className="text-sm" />
                          </button>
                          {!isPaid && p.payment_status !== 'waived' && (
                            <button
                              onClick={() => handleWaiveFee(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Waive Fee Invoice"
                            >
                              <FiAlertCircle className="text-sm" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadPayments(pagination.page - 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              >
                <FiChevronLeft />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadPayments(pagination.page + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collect Cash Modal */}
      {collectModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Record Student Payment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Invoice {selectedPayment.invoice_no} • {selectedPayment.student_name}
                </p>
              </div>
              <button
                onClick={() => setCollectModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleCollectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Collection Amount (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={collectData.paid_amount}
                  onChange={(e) => setCollectData({ ...collectData, paid_amount: e.target.value })}
                  className="w-full text-base font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={collectData.payment_method}
                  onChange={(e) => setCollectData({ ...collectData, payment_method: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="cash">Cash Collection (Office Desk)</option>
                  <option value="bank">Bank Deposit / Cheque</option>
                  <option value="pos">POS / Card Terminal</option>
                  <option value="bkash">bKash Manual / Agent</option>
                  <option value="nagad">Nagad Manual / Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Transaction / Money Receipt #
                </label>
                <input
                  type="text"
                  placeholder="Receipt # or bank slip ref"
                  value={collectData.transaction_id}
                  onChange={(e) => setCollectData({ ...collectData, transaction_id: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Collection Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional collection remarks..."
                  value={collectData.notes}
                  onChange={(e) => setCollectData({ ...collectData, notes: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCollectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collecting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {collecting ? 'Processing...' : 'Confirm Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

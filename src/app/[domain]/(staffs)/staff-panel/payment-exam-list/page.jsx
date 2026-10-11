'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FiSearch,
  FiCheckCircle,
  FiDollarSign,
  FiCreditCard,
  FiClock,
  FiEdit2,
  FiTrash2,
  FiAlertCircle,
  FiX
} from 'react-icons/fi';

export default function PaymentExamListPage() {
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ exams: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    id: '',
    paid_amount: '0.00',
    fine_amount: '0.00',
    payment_status: 'paid',
    payment_method: 'cash',
    transaction_id: '',
    notes: ''
  });

  // Load Exam Meta
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/exams/meta');
        if (res.ok) {
          const data = await res.json();
          setMeta({ exams: data.exams || [] });
        }
      } catch (err) {
        console.error('Failed to load exam metadata:', err);
      }
    }
    loadMeta();
  }, []);

  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (searchTerm) params.append('search', searchTerm);
      if (selectedExam !== 'all') params.append('exam_id', selectedExam);
      if (selectedStatus !== 'all') params.append('payment_status', selectedStatus);

      const res = await fetch(`/api/exams/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedExam, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  const handleOpenEdit = (pay) => {
    setEditingPayment(pay);
    setFormData({
      id: pay.id,
      paid_amount: pay.paid_amount || pay.amount || '0.00',
      fine_amount: pay.fine_amount || '0.00',
      payment_status: pay.payment_status || 'paid',
      payment_method: pay.payment_method || 'cash',
      transaction_id: pay.transaction_id || '',
      notes: pay.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleQuickMarkPaid = async (id) => {
    try {
      const res = await fetch('/api/exams/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, mark_paid: true })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        fetchPayments(pagination.page);
      } else {
        alert(resData.error || 'Failed to mark payment as paid.');
      }
    } catch (err) {
      alert('Error updating payment.');
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/exams/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setFeedback({ type: 'error', text: resData.error || 'Failed to update payment.' });
      } else {
        setFeedback({ type: 'success', text: resData.message || 'Payment updated successfully.' });
        setTimeout(() => {
          setIsModalOpen(false);
          setFeedback(null);
          fetchPayments(pagination.page);
        }, 700);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network connection error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, inv) => {
    if (!window.confirm(`Are you sure you want to delete payment record "${inv}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/exams/payments?id=${id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok && resData.success) {
        fetchPayments(pagination.page);
      } else {
        alert(resData.error || 'Failed to delete payment.');
      }
    } catch (err) {
      alert('Error deleting payment.');
    }
  };

  // Metrics
  const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
  const totalPending = Math.max(0, totalAmount - totalPaid);
  const paidCount = payments.filter(p => p.payment_status === 'paid').length;

  return (
    <div className="w-full space-y-4">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Invoices</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{pagination.total}</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">All Ledger</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Total Collected</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">৳{totalPaid.toFixed(2)}</span>
            <span className="text-[11px] font-medium text-slate-500">{paidCount} Paid</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Pending Dues</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">৳{totalPending.toFixed(2)}</span>
            <span className="text-[11px] font-medium text-rose-600/80">Outstanding</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Quick Filters</p>
          <div className="flex items-center gap-2 mt-1">
            <Link
              href="/staff-panel/payment-exam-paid"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Paid Only &rarr;
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/staff-panel/payment-exam-unpaid"
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Unpaid Only &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Workstation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search student, roll, or invoice no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 transition"
              />
            </div>

            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Examinations</option>
              {meta.exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name} ({ex.term})</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="waived">Waived</option>
            </select>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Invoice / Date</th>
                <th className="px-3 py-2.5">Student & Class</th>
                <th className="px-3 py-2.5">Examination & Fee Title</th>
                <th className="px-3 py-2.5 font-mono text-right">Fee Payable</th>
                <th className="px-3 py-2.5 font-mono text-right">Paid Amount</th>
                <th className="px-3 py-2.5">Payment Method</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading payment records...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-slate-400">
                    No fee payment records found. When students apply for exams, pending payments will appear here.
                  </td>
                </tr>
              ) : (
                payments.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">{row.invoice_no || `INV-${row.id}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.student_name || 'Student #' + row.student_id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Roll: {row.roll_no} | {row.class_name}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{row.exam_name}</div>
                      <div className="text-[10px] text-slate-500">{row.fee_title}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳{parseFloat(row.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{parseFloat(row.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] capitalize text-slate-600 dark:text-slate-300">
                        {row.payment_method || 'Cash'}
                      </span>
                      {row.transaction_id && (
                        <div className="text-[9px] text-slate-400 font-mono">Tx: {row.transaction_id}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        row.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : row.payment_status === 'partially_paid'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          : row.payment_status === 'waived'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                      }`}>
                        {row.payment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                      {row.payment_status !== 'paid' && (
                        <button
                          onClick={() => handleQuickMarkPaid(row.id)}
                          title="Mark Paid"
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(row)}
                        title="Edit / Collect"
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition cursor-pointer"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id, row.invoice_no)}
                        title="Delete Payment"
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Micro Pagination Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            Showing {payments.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </span>
          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => fetchPayments(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-white">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchPayments(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Collect & Update Exam Fee Payment
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              {feedback && (
                <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  feedback.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}>
                  {feedback.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {editingPayment?.student_name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Exam: <strong className="text-slate-700 dark:text-slate-300">{editingPayment?.exam_name}</strong>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Fee Title: {editingPayment?.fee_title} | Total Payable: ৳{parseFloat(editingPayment?.amount || 0).toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Status *
                </label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="paid">Paid (Fully Cleared)</option>
                  <option value="pending">Pending</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="waived">Waived</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Paid (BDT) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fine / Late Charge (BDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fine_amount}
                    onChange={(e) => setFormData({ ...formData, fine_amount: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="bank">Bank Deposit</option>
                    <option value="online">Online Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TR-892301"
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Receipt number, bank deposit branch, or cashier notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export default function SalaryPaymentsManager({ roleType = 'teacher', title, subtitle }) {
  const isTeacher = roleType === 'teacher';
  const paymentsApi = isTeacher
    ? '/api/staff/panel/teacher-salary-payments'
    : '/api/staff/panel/officer-salary-payments';

  const defaultTitle = isTeacher ? 'Teacher Salary Payments' : 'Officer Salary Payments';
  const defaultSubtitle = isTeacher
    ? 'Monthly salary disbursement ledger, payslips generation, and transaction payment tracking for teachers.'
    : 'Monthly salary disbursement ledger, payslips generation, and transaction payment tracking for officers.';

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const [month, setMonth] = useState(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [generating, setGenerating] = useState(false);

  // Edit / Record Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount_paid: '',
    payment_status: 'Paid',
    payment_method: 'Bank Transfer',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    remarks: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Payslip View Modal
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [viewingSlip, setViewingSlip] = useState(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`${paymentsApi}?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setSummary(data.summary || {});
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to fetch payments.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error fetching salary payments.' });
    } finally {
      setLoading(false);
    }
  }, [paymentsApi, month, statusFilter, searchTerm]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Bulk generate monthly slips
  const handleGenerateSlips = async () => {
    if (!window.confirm(`Generate monthly salary slips for all active ${isTeacher ? 'teachers' : 'officers'} for ${month}?`)) {
      return;
    }

    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch(paymentsApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_month', month }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        fetchPayments();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to generate slips.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error generating slips.' });
    } finally {
      setGenerating(false);
    }
  };

  const openRecordModal = (payment) => {
    setEditingPayment(payment);
    setPaymentFormData({
      amount_paid: payment.amount_paid ? String(payment.amount_paid) : (payment.net_salary ? String(payment.net_salary) : '0'),
      payment_status: payment.payment_status === 'Pending' ? 'Paid' : payment.payment_status,
      payment_method: payment.payment_method || 'Bank Transfer',
      payment_date: payment.payment_date ? String(payment.payment_date).slice(0, 10) : new Date().toISOString().split('T')[0],
      transaction_id: payment.transaction_id || '',
      remarks: payment.remarks || '',
    });
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!editingPayment) return;

    setSavingPayment(true);
    setFeedback(null);
    try {
      const res = await fetch(paymentsApi, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPayment.payment_id,
          ...paymentFormData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setPaymentModalOpen(false);
        fetchPayments();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to update payment.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error updating payment.' });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (id, personName) => {
    if (!window.confirm(`Delete payment slip for ${personName}?`)) return;
    try {
      const res = await fetch(`${paymentsApi}?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        fetchPayments();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to delete payment slip.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Network error deleting payment slip.' });
    }
  };

  const openPayslip = (payment) => {
    setViewingSlip(payment);
    setPayslipModalOpen(true);
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {title || defaultTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle || defaultSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white"
          />
          <button
            onClick={handleGenerateSlips}
            disabled={generating}
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors shadow-2xs disabled:opacity-50"
          >
            {generating ? 'Generating...' : `Generate ${month} Slips`}
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="font-semibold text-slate-500 hover:text-slate-700 ml-2">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Monthly KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Slips</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold font-mono text-slate-900 dark:text-white">
              {summary.total_slips || 0}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ৳{Number(summary.total_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Paid Slips</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400">
              {summary.paid_count || 0}
            </span>
            <span className="text-[10px] font-mono text-emerald-600">
              ৳{Number(summary.paid_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Pending Payout</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold font-mono text-amber-600 dark:text-amber-400">
              {summary.pending_count || 0}
            </span>
            <span className="text-[10px] font-mono text-amber-600">
              ৳{Number(summary.pending_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-2xs">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Disbursement Rate</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold font-mono text-blue-600 dark:text-blue-400">
              {summary.total_slips > 0 ? `${Math.round(((summary.paid_count || 0) / summary.total_slips) * 100)}%` : '0%'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{month}</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${isTeacher ? 'teacher' : 'officer'}, transaction ID...`}
            className="w-full max-w-sm text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-900 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
          {payments.length} slip{payments.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-x-auto shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <th className="py-2.5 px-3">Personnel</th>
              <th className="py-2.5 px-3">Month</th>
              <th className="py-2.5 px-3">Payroll Scale</th>
              <th className="py-2.5 px-3 font-mono text-right">Net Payable</th>
              <th className="py-2.5 px-3 font-mono text-right">Amount Paid</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3">Payment Info</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Loading payment records...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No payment slips found for {month}. Click "Generate {month} Slips" above to create records.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const name = isTeacher ? p.teacher_name : p.officer_name;
                const email = isTeacher ? p.teacher_email : p.officer_email;
                const roleDesc = isTeacher ? (p.designation_name || 'Teacher') : (`${p.department || 'General'} • ${p.designation || 'Officer'}`);
                const isPaid = p.payment_status === 'Paid';

                return (
                  <tr key={p.payment_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{roleDesc} • {email}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {p.month}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {p.payroll_title || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-medium text-slate-900 dark:text-white">
                      ৳{Number(p.net_salary || p.amount_paid).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ৳{Number(p.amount_paid).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : p.payment_status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                      {isPaid ? (
                        <div>
                          <span>{p.payment_method}</span>
                          {p.transaction_id && <span className="block text-[10px] text-slate-400">Tx: {p.transaction_id}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unprocessed</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openRecordModal(p)}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                          isPaid
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {isPaid ? 'Edit Payment' : 'Mark Paid'}
                      </button>
                      <button
                        onClick={() => openPayslip(p)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded transition-colors"
                      >
                        Slip
                      </button>
                      <button
                        onClick={() => handleDeletePayment(p.payment_id, name)}
                        className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record / Edit Payment Modal */}
      {paymentModalOpen && editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Record Payment: {isTeacher ? editingPayment.teacher_name : editingPayment.officer_name}
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-4 space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="block font-semibold text-slate-900 dark:text-white">
                    {isTeacher ? editingPayment.teacher_name : editingPayment.officer_name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Period: {editingPayment.month}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 uppercase block">Net Salary</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ৳{Number(editingPayment.net_salary || editingPayment.amount_paid).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Amount Paid (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentFormData.amount_paid}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount_paid: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Status & Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentFormData.payment_status}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentFormData.payment_method}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                  </select>
                </div>
              </div>

              {/* Date & Transaction ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transaction / Reference ID
                  </label>
                  <input
                    type="text"
                    value={paymentFormData.transaction_id}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, transaction_id: e.target.value })}
                    placeholder="e.g. TXN-892187"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Note
                </label>
                <textarea
                  rows={2}
                  value={paymentFormData.remarks}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, remarks: e.target.value })}
                  placeholder="Optional bank voucher note..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                >
                  {savingPayment ? 'Saving...' : 'Save Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {payslipModalOpen && viewingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl max-w-md w-full p-5 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Salary Payslip</span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTeacher ? viewingSlip.teacher_name : viewingSlip.officer_name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">Month: {viewingSlip.month}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  viewingSlip.payment_status === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {viewingSlip.payment_status}
              </span>
            </div>

            {/* Scale & Breakdown */}
            <div className="space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Payroll Scale</span>
                <span className="font-semibold text-slate-900 dark:text-white">{viewingSlip.payroll_title || 'Standard'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Basic Salary</span>
                <span>৳{Number(viewingSlip.basic_salary || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">House Rent</span>
                <span>৳{Number(viewingSlip.house_rent || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Medical Allowance</span>
                <span>৳{Number(viewingSlip.medical_allowance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Transport & Other</span>
                <span>৳{(Number(viewingSlip.transport_allowance || 0) + Number(viewingSlip.other_allowance || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
                <span>Gross Total</span>
                <span>৳{Number(viewingSlip.gross_salary || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400 border-b border-slate-100 dark:border-slate-800">
                <span>Total Deductions (PF, Tax)</span>
                <span>-৳{Number(viewingSlip.total_deductions || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 rounded">
                <span>Net Salary Payable</span>
                <span>৳{Number(viewingSlip.amount_paid).toLocaleString()}</span>
              </div>
            </div>

            {/* Payout meta */}
            {viewingSlip.payment_status === 'Paid' && (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div>Method: <span className="font-semibold">{viewingSlip.payment_method || 'Bank Transfer'}</span></div>
                {viewingSlip.transaction_id && <div>Reference / Tx: <span className="font-mono">{viewingSlip.transaction_id}</span></div>}
                {viewingSlip.payment_date && <div>Disbursed On: <span className="font-mono">{String(viewingSlip.payment_date).slice(0, 10)}</span></div>}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded"
              >
                Print Slip
              </button>
              <button
                onClick={() => setPayslipModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

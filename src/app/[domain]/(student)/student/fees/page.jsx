'use client';

import React, { useEffect, useState } from 'react';
import {
  FiDollarSign,
  FiClock,
  FiCheck,
  FiPrinter,
  FiAlertCircle,
  FiCreditCard,
  FiX,
  FiCheckCircle,
  FiShield,
  FiSmartphone,
} from 'react-icons/fi';
import { printStudentFeeReceipt } from 'src/lib/receipts/student_fee';

const FeesPage = () => {
  const [data, setData] = useState({ fees: [], fines: [], student: {} });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paySuccessData, setPaySuccessData] = useState(null);

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/student/fees');
      if (res.ok) {
        const resData = await res.json();
        setData(resData.paylod || { fees: [], fines: [], student: {} });
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
      showFeedback('error', 'Network error fetching fees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleOpenPayModal = (fee) => {
    setSelectedFee(fee);
    setPaymentMethod('bkash');
    setAccountNumber('');
    setTransactionId('');
    setPaySuccessData(null);
    setPayModalOpen(true);
  };

  const handleClosePayModal = () => {
    setPayModalOpen(false);
    setSelectedFee(null);
    setPaySuccessData(null);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedFee) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/student/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: selectedFee.payment_id || selectedFee.id,
          fee_type: selectedFee.type || 'Education Fee',
          payment_method: paymentMethod,
          account_number: accountNumber,
          transaction_id: transactionId,
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setPaySuccessData({
          transaction_id: resJson.transaction_id,
          fee: selectedFee,
        });
        showFeedback('success', resJson.message || 'Payment cleared successfully!');
        fetchFees();
      } else {
        showFeedback('error', resJson.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      showFeedback('error', 'Network error processing payment.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading your fee ledger...</p>
      </div>
    );
  }

  const { fees = [], student = {} } = data;

  const educationFees = fees.filter((f) => f.type === 'Education Fee');
  const examFees = fees.filter((f) => f.type === 'Exam Fee');

  // Calculate summary stats
  const totalUnpaid = fees
    .filter((f) => (f.status || '').toLowerCase() !== 'paid' && (f.status || '').toLowerCase() !== 'waived')
    .reduce((sum, f) => sum + (parseFloat(f.amount || 0) + parseFloat(f.fine_amount || 0) - parseFloat(f.paid_amount || 0)), 0);

  const totalPaid = fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);

  const stats = [
    {
      label: 'Outstanding Dues',
      value: `৳${totalUnpaid.toFixed(2)}`,
      sub: totalUnpaid > 0 ? 'Pending payment balance' : 'No outstanding dues',
      color: totalUnpaid > 0 ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-slate-50 text-slate-700 border-slate-200/60',
      icon: FiClock,
    },
    {
      label: 'Total Paid Fees',
      value: `৳${totalPaid.toFixed(2)}`,
      sub: 'Total cleared institutional transactions',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      icon: FiCheck,
    },
  ];

  const getStatusBadge = (status) => {
    const norm = (status || 'unpaid').toLowerCase();
    switch (norm) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <FiCheck className="text-xs" /> Paid
          </span>
        );
      case 'partially_paid':
      case 'partially paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            Partial
          </span>
        );
      case 'waived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Waived
          </span>
        );
      case 'unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
            <FiClock className="text-xs" /> Due
          </span>
        );
    }
  };

  const renderFeeRow = (fee) => {
    const totalRequired = parseFloat(fee.amount || 0) + parseFloat(fee.fine_amount || 0);
    const netDue = Math.max(0, totalRequired - parseFloat(fee.paid_amount || 0));
    const isPaid = (fee.status || '').toLowerCase() === 'paid';

    return (
      <tr key={fee.id} className="hover:bg-slate-50/60 transition-colors">
        <td className="py-3.5 px-4 font-bold text-slate-800">
          <div className="flex items-center gap-2">
            <span>{fee.title}</span>
            {fee.month_name && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {fee.month_name}
              </span>
            )}
          </div>
          {fee.invoice_no && (
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Invoice: {fee.invoice_no}
            </div>
          )}
        </td>
        <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
          {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
        </td>
        <td className="py-3.5 px-4">
          {getStatusBadge(fee.status)}
        </td>
        <td className="py-3.5 px-4 font-bold text-slate-800 text-right font-mono text-xs">
          ৳{parseFloat(fee.amount).toFixed(2)}
          {parseFloat(fee.fine_amount || 0) > 0 && (
            <span className="text-[10px] text-rose-500 font-normal block">
              +৳{parseFloat(fee.fine_amount).toFixed(2)} fine
            </span>
          )}
        </td>
        <td className="py-3.5 px-4 font-semibold text-emerald-700 text-right font-mono text-xs">
          ৳{parseFloat(fee.paid_amount || 0).toFixed(2)}
        </td>
        <td className="py-3.5 px-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {!isPaid && fee.status !== 'waived' && (
              <button
                onClick={() => handleOpenPayModal(fee)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <FiCreditCard className="text-xs" /> Pay Now
              </button>
            )}
            <button
              onClick={() => printStudentFeeReceipt(fee, student || fee)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <FiPrinter className="text-xs" /> Receipt
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      {/* Feedback Toast */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiDollarSign /> Student Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Financial Ledger & Fees</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
            Track tuition fee ledgers, exam fees, pay dues online via bKash / Cards, and download verified receipts.
          </p>
        </div>
        {student.name && (
          <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-800 block">{student.name}</span>
            <span className="text-slate-500 font-mono">
              Roll: {student.roll_no || '—'} • Reg: {student.registration_no || '—'}
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`p-6 rounded-3xl border ${stat.color} flex items-center justify-between shadow-xs`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80 block mb-1">{stat.label}</span>
                <span className="text-2xl sm:text-3xl font-bold block mb-0.5">{stat.value}</span>
                <span className="text-xs opacity-75">{stat.sub}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/40 backdrop-blur-xs border border-white/20">
                <Icon className="text-2xl opacity-90" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Class Education Fees Section */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiDollarSign className="text-indigo-600" /> Class Tuition & Education Fees
            </h2>
            <p className="text-xs text-slate-400 font-medium">Monthly tuition, admission, and academic dues</p>
          </div>
        </div>

        {educationFees.length === 0 ? (
          <p className="text-slate-400 text-xs font-medium text-center py-10 border border-dashed border-slate-200 rounded-2xl">
            No education fee invoices issued for your account.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fee Description</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {educationFees.map(renderFeeRow)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Exam Registration Fees Section */}
      {examFees.length > 0 && (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FiClock className="text-purple-600" /> Term Examination Registration Fees
              </h2>
              <p className="text-xs text-slate-400 font-medium">Exam candidate registration charges</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Exam Fee Description</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {examFees.map(renderFeeRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Online Pay Modal */}
      {payModalOpen && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                  <FiShield /> Secure Payment Gateway
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Pay Student Fee Online</h3>
              </div>
              <button onClick={handleClosePayModal} className="p-2 text-slate-400 hover:text-white cursor-pointer">
                <FiX className="text-lg" />
              </button>
            </div>

            {paySuccessData ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl">
                  <FiCheck />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900">Payment Completed!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Your institutional fee invoice has been cleared successfully.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice:</span>
                    <span className="font-mono font-bold text-slate-800">{paySuccessData.fee?.invoice_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction ID:</span>
                    <span className="font-mono font-bold text-emerald-700">{paySuccessData.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-bold text-slate-900">
                      ৳{(parseFloat(paySuccessData.fee?.amount || 0) + parseFloat(paySuccessData.fee?.fine_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      handleClosePayModal();
                      printStudentFeeReceipt(
                        {
                          ...paySuccessData.fee,
                          transaction_id: paySuccessData.transaction_id,
                          status: 'paid',
                          paid_amount: parseFloat(paySuccessData.fee?.amount || 0) + parseFloat(paySuccessData.fee?.fine_amount || 0),
                        },
                        student
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <FiPrinter /> Print Receipt
                  </button>
                  <button
                    onClick={handleClosePayModal}
                    className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment} className="p-6 space-y-5">
                {/* Invoice Summary Box */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Payable Invoice
                    </span>
                    <span className="font-bold text-slate-900 text-sm block">{selectedFee.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Invoice #{selectedFee.invoice_no}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Net Total
                    </span>
                    <span className="text-xl font-black text-indigo-950 font-mono">
                      ৳{(parseFloat(selectedFee.amount || 0) + parseFloat(selectedFee.fine_amount || 0) - parseFloat(selectedFee.paid_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Channel Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Select Payment Gateway
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'bkash', name: 'bKash', color: 'border-pink-500 text-pink-700 bg-pink-50/50' },
                      { id: 'nagad', name: 'Nagad', color: 'border-orange-500 text-orange-700 bg-orange-50/50' },
                      { id: 'rocket', name: 'Rocket', color: 'border-purple-500 text-purple-700 bg-purple-50/50' },
                      { id: 'card', name: 'Card / Visa', color: 'border-blue-500 text-blue-700 bg-blue-50/50' },
                      { id: 'bank', name: 'Bank Net', color: 'border-emerald-500 text-emerald-700 bg-emerald-50/50' },
                      { id: 'online', name: 'Gateway', color: 'border-slate-500 text-slate-700 bg-slate-50' },
                    ].map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setPaymentMethod(ch.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          paymentMethod === ch.id
                            ? `${ch.color} ring-2 ring-indigo-500/30`
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {ch.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account / Mobile Number Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {paymentMethod === 'card'
                      ? 'Card Number (Simulated)'
                      : `${paymentMethod.toUpperCase()} Account Number`}
                  </label>
                  <div className="relative">
                    <FiSmartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={paymentMethod === 'card' ? '4111 2222 3333 4444' : '017XXXXXXXX'}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                {/* Transaction ID (optional simulator input) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    TrxID / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave empty for auto-generated gateway reference"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-mono placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClosePayModal}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing || !accountNumber.trim()}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {processing ? 'Authorizing Payment...' : `Authorize & Pay ৳${(parseFloat(selectedFee.amount || 0) + parseFloat(selectedFee.fine_amount || 0) - parseFloat(selectedFee.paid_amount || 0)).toFixed(2)}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesPage;

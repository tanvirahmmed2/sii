'use client';

import React, { useEffect, useState } from 'react';
import TenantLoader from 'src/component/tenant/TenantLoader';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import { printStudentFeeReceipt } from 'src/lib/receipts/student_fee';

const FeesPage = () => {
  const { getApiEndpoint } = useTenantWebsite();

  const [data, setData] = useState({ fees: [], fines: [], student: {} });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [assignedGateways, setAssignedGateways] = useState([]);
  const [institutionCurrency, setInstitutionCurrency] = useState('BDT');

  // Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [selectedGatewayAccount, setSelectedGatewayAccount] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paySuccessData, setPaySuccessData] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchFees = async () => {
    try {
      const res = await fetch(getApiEndpoint('student/fees'));
      if (res.ok) {
        const resData = await res.json();
        const payload = resData.payload || resData.paylod || resData;
        setData(payload || { fees: [], fines: [], student: {} });
        if (resData.assigned_gateways || payload.assigned_gateways) {
          setAssignedGateways(resData.assigned_gateways || payload.assigned_gateways || []);
        }
        if (resData.currency || payload.currency) {
          setInstitutionCurrency(resData.currency || payload.currency || 'BDT');
        }
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
  }, [getApiEndpoint]);

  const handleOpenPayModal = (fee) => {
    setSelectedFee(fee);
    const initialGw = assignedGateways.length > 0 ? assignedGateways[0] : null;
    setSelectedGatewayAccount(initialGw);
    setPaymentMethod(initialGw?.gateway_code || 'bkash');
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
      const res = await fetch(getApiEndpoint('student/fees/pay'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: selectedFee.payment_id || selectedFee.id,
          fee_type: selectedFee.type || 'Education Fee',
          payment_method: paymentMethod,
          gateway_account_id: selectedGatewayAccount?.id || selectedGatewayAccount?.gateway_account_id || null,
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
    return <TenantLoader fullScreen={false} />;
  }

  const { fees = [], student = {} } = data;
  const currencySymbol = institutionCurrency === 'USD' ? '$' : '৳';

  const educationFees = fees.filter((f) => f.type === 'Education Fee');
  const examFees = fees.filter((f) => f.type === 'Exam Fee');

  const totalUnpaid = fees
    .filter((f) => (f.status || '').toLowerCase() !== 'paid' && (f.status || '').toLowerCase() !== 'waived')
    .reduce((sum, f) => sum + (parseFloat(f.amount || 0) + parseFloat(f.fine_amount || 0) - parseFloat(f.paid_amount || 0)), 0);

  const totalPaid = fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);

  const stats = [
    {
      label: 'Outstanding Dues',
      value: `${currencySymbol}${totalUnpaid.toFixed(2)}`,
      sub: totalUnpaid > 0 ? 'Pending payment balance' : 'No outstanding dues',
      isWarning: totalUnpaid > 0,
    },
    {
      label: 'Total Paid Fees',
      value: `${currencySymbol}${totalPaid.toFixed(2)}`,
      sub: 'Verified institutional receipts',
      isSuccess: true,
    },
    {
      label: 'Pending Invoices',
      value: fees.filter((f) => (f.status || '').toLowerCase() !== 'paid' && (f.status || '').toLowerCase() !== 'waived').length,
      sub: 'Action required',
    },
  ];

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            Tuition Fees &amp; Invoices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View fee invoices, pay fees online, and download verified payment receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Reg: {student.registration_no || student.registration_number || 'N/A'}
          </span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`w-full px-3 py-2 rounded-md text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-1"
          >
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
            <div
              className={`text-lg font-semibold font-mono ${
                s.isWarning
                  ? 'text-rose-600 dark:text-rose-400'
                  : s.isSuccess
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {s.value}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Education Fees Section */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Class Tuition &amp; Monthly Fees
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Regular academic session tuition installments.
          </p>
        </div>

        {educationFees.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
            No class tuition fees recorded for your account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3 font-medium">Invoice No</th>
                  <th className="py-2.5 px-3 font-medium">Fee Title</th>
                  <th className="py-2.5 px-3 font-medium">Month / Term</th>
                  <th className="py-2.5 px-3 font-medium">Due Date</th>
                  <th className="py-2.5 px-3 font-medium">Amount</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {educationFees.map((fee) => {
                  const isPaid = (fee.status || '').toLowerCase() === 'paid';
                  const isOverdue = !isPaid && fee.due_date && new Date(fee.due_date) < new Date();
                  const netDue = (parseFloat(fee.amount || 0) + parseFloat(fee.fine_amount || 0)) - parseFloat(fee.paid_amount || 0);

                  return (
                    <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {fee.invoice_no || `INV-${fee.id}`}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {fee.title || fee.fee_type || 'Tuition Fee'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {fee.month_name || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                        {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                        {currencySymbol}{parseFloat(fee.amount).toFixed(2)}
                        {fee.fine_amount > 0 && (
                          <span className="block text-[10px] text-rose-600 font-normal">
                            +{currencySymbol}{parseFloat(fee.fine_amount).toFixed(2)} Fine
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isPaid ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPaid ? (
                            <button
                              type="button"
                              onClick={() => printStudentFeeReceipt(fee, student, institutionCurrency)}
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                            >
                              Print Receipt
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(fee)}
                              className="px-3 py-1 rounded-md bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
                            >
                              Pay {currencySymbol}{netDue.toFixed(2)}
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
      </div>

      {/* Exam Fees Section */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-5 space-y-3">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Examination Registration Fees
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Required registration fees for published examination permits.
          </p>
        </div>

        {examFees.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
            No examination fees pending or recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3 font-medium">Exam Name</th>
                  <th className="py-2.5 px-3 font-medium">Term</th>
                  <th className="py-2.5 px-3 font-medium">Amount</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {examFees.map((fee) => {
                  const isPaid = (fee.status || '').toLowerCase() === 'paid';

                  return (
                    <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {fee.title || fee.exam_name || 'Exam Fee'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {fee.exam_term || 'Term Final'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                        {currencySymbol}{parseFloat(fee.amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isPaid ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Paid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPaid ? (
                            <button
                              type="button"
                              onClick={() => printStudentFeeReceipt(fee, student, institutionCurrency)}
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                            >
                              Print Receipt
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(fee)}
                              className="px-3 py-1 rounded-md bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition"
                            >
                              Pay Online
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
      </div>

      {/* Online Payment Modal */}
      {payModalOpen && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Online Fee Payment Checkout
              </h3>
              <button
                type="button"
                onClick={handleClosePayModal}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>

            {paySuccessData ? (
              <div className="space-y-4 text-center py-4">
                <span className="inline-block px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  Payment Recorded Successfully
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Transaction ID: <code className="font-mono font-semibold text-slate-900 dark:text-white">{paySuccessData.transaction_id}</code>
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      printStudentFeeReceipt(
                        { ...selectedFee, payment_status: 'Paid', status: 'paid', transaction_id: paySuccessData.transaction_id },
                        student,
                        institutionCurrency
                      );
                      handleClosePayModal();
                    }}
                    className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium cursor-pointer transition"
                  >
                    Download Receipt
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePayModal}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment} className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{selectedFee.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Payable:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {currencySymbol}{(parseFloat(selectedFee.amount || 0) + parseFloat(selectedFee.fine_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {assignedGateways.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Select Payment Gateway *
                    </label>
                    <select
                      value={selectedGatewayAccount?.id || ''}
                      onChange={(e) => {
                        const gw = assignedGateways.find((g) => String(g.id) === String(e.target.value));
                        setSelectedGatewayAccount(gw);
                        setPaymentMethod(gw?.gateway_code || 'bkash');
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      {assignedGateways.map((gw) => (
                        <option key={gw.id} value={gw.id}>
                          {gw.gateway_name || gw.gateway_code.toUpperCase()} ({gw.currency || 'BDT'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Sender Account / Phone</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Transaction ID</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TXN98765432"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClosePayModal}
                    className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-1.5 rounded-md bg-secondary hover:bg-secondary-dark text-white text-xs font-medium cursor-pointer shadow-xs transition disabled:opacity-50"
                  >
                    {processing ? 'Processing Payment...' : 'Confirm Payment'}
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

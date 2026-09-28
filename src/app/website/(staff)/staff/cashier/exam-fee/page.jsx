'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiBookOpen, FiDollarSign, FiClock, FiCheck, FiSearch, FiSliders, FiCreditCard, FiAlertOctagon, FiPrinter } from 'react-icons/fi';
import { printStudentFeeReceipt } from '@/lib/receipts/student_fee';

const CashierExamFeePage = () => {
  const [role, setRole] = useState(null);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [fees, setFees] = useState([]);

  // Filters
  const [filterClassId, setFilterClassId] = useState('');
  const [filterExamId, setFilterExamId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Recording Modal State
  const [recordingPaymentFee, setRecordingPaymentFee] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Fetch initial lookup lists and fee data
  const fetchInitialData = async () => {
    try {
      const profileRes = await fetch('/api/staff/me');
      if (!profileRes.ok) {
        setLoading(false);
        return;
      }
      const profileData = await profileRes.json();
      const userRole = profileData.paylod?.staff?.role;
      setRole(userRole);

      if (userRole === 'cashier') {
        const [classesRes, examsRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/exams')
        ]);

        if (classesRes.ok && examsRes.ok) {
          const classesData = await classesRes.json();
          const examsData = await examsRes.json();
          setClasses(classesData.paylod?.classes || []);
          setExams(examsData.paylod?.exams || []);
        }
      }
    } catch (err) {
      toast.error('Failed to load initial metadata.');
    }
  };

  // Fetch all exam fee records
  const fetchFees = async () => {
    setLoading(true);
    try {
      let feesUrl = '/api/students/fees';
      const params = [];
      if (filterClassId) params.push(`class_id=${filterClassId}`);
      if (params.length > 0) feesUrl += '?' + params.join('&');

      const feesRes = await fetch(feesUrl);
      const feesData = await feesRes.json();
      const allFees = feesData.paylod?.fees || [];

      // Filter for exam-related fee invoices
      const examFeeList = allFees.filter(f => 
        (f.title || '').toLowerCase().includes('exam')
      );

      setFees(examFeeList);
    } catch (err) {
      toast.error('Failed to retrieve exam fee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (role === 'cashier') {
      fetchFees();
    }
  }, [filterClassId, role]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/students/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fee_id: recordingPaymentFee.id,
          paid_amount: paymentAmount,
          payment_method: paymentMethod,
          transaction_id: transactionId,
          remarks: remarks
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment.');

      toast.success(data.message || 'Payment logged successfully.');
      setRecordingPaymentFee(null);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setTransactionId('');
      setRemarks('');
      fetchFees();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading && !role) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading exam billing records...</span>
      </div>
    );
  }

  if (role !== 'cashier') {
    return (
      <div className="w-full max-w-md mx-auto mt-16 p-8 bg-red-50 border border-red-100 rounded-3xl text-center flex flex-col items-center gap-4 shadow-sm animate-fade-up">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FiAlertOctagon className="text-red-600 text-xl" />
        </div>
        <div>
          <h2 className="text-base font-bold text-red-800">Access Denied</h2>
          <p className="text-xs text-red-650 mt-1">
            This module is restricted to the <strong>Cashier</strong> role only.
          </p>
        </div>
      </div>
    );
  }

  // Filter fees list by search query, selected exam, and status
  const filteredFees = fees.filter((fee) => {
    const rawStatus = (fee.status || 'unpaid').toLowerCase();
    
    // Status Filter
    if (statusFilter && rawStatus !== statusFilter.toLowerCase()) {
      return false;
    }

    // Exam Filter
    if (filterExamId) {
      const selectedExamObj = exams.find(e => String(e.id) === String(filterExamId));
      if (selectedExamObj && !fee.title.toLowerCase().includes(selectedExamObj.name.toLowerCase())) {
        return false;
      }
    }

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (fee.student_name || '').toLowerCase().includes(q);
      const matchReg = (fee.registration_number || '').toLowerCase().includes(q);
      const matchTitle = (fee.title || '').toLowerCase().includes(q);
      return matchName || matchReg || matchTitle;
    }

    return true;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiBookOpen className="text-primary" /> Examination Fees Cashier Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review student exam billing invoices, collect counter fee payments, and issue printable receipts.
          </p>
        </div>
      </div>

      {/* Record Payment Dialog Modal */}
      {recordingPaymentFee && (
        <form onSubmit={handleRecordPayment} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col gap-5 animate-fade-down">
          <div>
            <h2 className="text-base font-bold text-slate-850 flex items-center gap-1.5">
              <FiCreditCard className="text-primary" /> Record Student Exam Fee Payment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log transaction receipt for student <strong>{recordingPaymentFee.student_name}</strong> for invoice <em>{recordingPaymentFee.title}</em>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount to Pay (BDT) *</label>
              <input
                type="number"
                step="0.01"
                required
                max={(parseFloat(recordingPaymentFee.amount) - parseFloat(recordingPaymentFee.paid_amount || 0)).toFixed(2)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
              <span className="text-[10px] text-slate-450 font-semibold px-0.5">
                Outstanding: ৳{(parseFloat(recordingPaymentFee.amount) - parseFloat(recordingPaymentFee.paid_amount || 0)).toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary cursor-pointer"
              >
                <option value="Cash">Cash Desk</option>
                <option value="bKash">bKash Merchant</option>
                <option value="Rocket">Rocket Pay</option>
                <option value="Nagad">Nagad Pay</option>
                <option value="Bank Transfer">Direct Bank Transfer</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRecordingPaymentFee(null)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPayment}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {submittingPayment ? 'Processing Payment...' : 'Confirm Receipt Payment'}
            </button>
          </div>
        </form>
      )}

      {/* Selectors / Filters Bar */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col lg:flex-row items-center gap-4">
        {/* Search */}
        <div className="w-full lg:flex-1 relative">
          <FiSearch className="absolute left-4 top-3.5 text-slate-400 text-base" />
          <input
            type="text"
            placeholder="Search by student name, registration number, or exam title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-primary"
          />
        </div>

        {/* Dropdowns */}
        <div className="w-full lg:w-fit flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-48 flex flex-col gap-1">
            <select
              value={filterExamId}
              onChange={(e) => setFilterExamId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-pointer"
            >
              <option value="">All Exams...</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-48 flex flex-col gap-1">
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-pointer"
            >
              <option value="">All Classes...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-40 flex flex-col gap-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-pointer"
            >
              <option value="">All Statuses...</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partially paid">Partially Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        {filteredFees.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-5xl mb-3">💵</span>
            <h3 className="text-sm font-bold text-slate-600">No Exam Fee Invoices Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              No student exam fee records correspond to the selected search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Fee Due</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFees.map((fee) => {
                  const rawStatus = (fee.status || 'unpaid').toLowerCase();
                  const isPaid = rawStatus === 'paid';
                  const isPartiallyPaid = rawStatus === 'partially paid';

                  return (
                    <tr key={fee.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{fee.student_name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">Reg: #{fee.registration_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">{fee.class_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700">{fee.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold">
                        <div className="flex items-center gap-1">
                          <FiClock />
                          {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 text-right">
                        ৳{parseFloat(fee.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary text-right">
                        ৳{parseFloat(fee.paid_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : isPartiallyPaid
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {rawStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {!isPaid ? (
                          <button
                            onClick={() => {
                              setRecordingPaymentFee(fee);
                              setPaymentAmount((parseFloat(fee.amount) - parseFloat(fee.paid_amount || 0)).toFixed(2));
                            }}
                            className="text-xs font-bold text-primary bg-primary-light hover:bg-primary-dark hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <FiCreditCard className="text-xs" /> Record Pay
                          </button>
                        ) : (
                          <button
                            onClick={() => printStudentFeeReceipt(fee, fee)}
                            className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <FiPrinter className="text-xs" /> Print Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierExamFeePage;

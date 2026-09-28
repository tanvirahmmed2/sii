'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiDollarSign, FiPlus, FiX, FiLayers, FiUsers, FiCreditCard, FiAlertTriangle, FiBookOpen, FiClock, FiSearch } from 'react-icons/fi';

const CashierMonthlyFeePage = () => {
  const [role, setRole] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);

  // Filter selections
  const [filterClassId, setFilterClassId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice creation form states
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [invTitle, setInvTitle] = useState('Monthly Tuition Fee');
  const [invAmount, setInvAmount] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invClassId, setInvClassId] = useState('');
  const [invStudentId, setInvStudentId] = useState('');
  const [invStudentsList, setInvStudentsList] = useState([]);

  // Payment modal state
  const [recordingPaymentFee, setRecordingPaymentFee] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial lookup lists
  const fetchInitialData = async () => {
    try {
      const profileRes = await fetch('/api/staff/me');
      if (!profileRes.ok) {
        setLoading(false);
        return;
      }
      const profileData = await profileRes.json();
      const userRole = profileData.paylod.staff.role;
      setRole(userRole);

      if (userRole === 'cashier') {
        const classesRes = await fetch('/api/classes');
        const classesData = await classesRes.json();
        setClasses(classesData.paylod?.classes || []);

        const studentsRes = await fetch('/api/students');
        const studentsData = await studentsRes.json();
        setStudents(studentsData.paylod?.students || []);
      }
    } catch (err) {
      toast.error('Failed to load classes or student roster.');
    }
  };

  // Fetch fees log list
  const fetchFees = async () => {
    setLoading(true);
    try {
      let feesUrl = '/api/students/fees';
      const params = [];
      if (filterClassId) params.push(`class_id=${filterClassId}`);
      if (filterStudentId) params.push(`student_id=${filterStudentId}`);
      if (params.length > 0) feesUrl += '?' + params.join('&');

      const feesRes = await fetch(feesUrl);
      const feesData = await feesRes.json();
      setFees(feesData.paylod?.fees || []);
    } catch (err) {
      toast.error('Failed to retrieve billing records.');
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
  }, [filterClassId, filterStudentId, role]);

  // Fetch students for Invoice creation dropdown based on class selection
  useEffect(() => {
    if (!invClassId) {
      setInvStudentsList([]);
      setInvStudentId('');
      return;
    }
    const fetchClassStudents = async () => {
      const res = await fetch(`/api/students?class_id=${invClassId}`);
      const data = await res.json();
      setInvStudentsList((data.paylod.students || []).filter((s) => s.is_registered));
      setInvStudentId('');
    };
    fetchClassStudents();
  }, [invClassId]);

  // Create Fee Invoices
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invTitle || !invAmount || !invDueDate) {
      toast.error('Invoice details are required.');
      return;
    }

    if (!invClassId && !invStudentId) {
      toast.error('Assign target (Class or individual Student) is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: invStudentId || null,
          class_id: invClassId || null,
          title: invTitle,
          amount: invAmount,
          due_date: invDueDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate fee logs.');

      toast.success(data.message || 'Monthly fee invoices generated successfully!');
      setInvTitle('Monthly Tuition Fee');
      setInvAmount('');
      setInvDueDate('');
      setInvClassId('');
      setInvStudentId('');
      setShowAddInvoice(false);
      fetchFees();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Fee Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  if (loading && !role) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-sky-650 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading billing records...</span>
      </div>
    );
  }

  if (role !== 'cashier') {
    return (
      <div className="w-full max-w-md mx-auto mt-16 p-8 bg-red-50 border border-red-100 rounded-3xl text-center flex flex-col items-center gap-4 shadow-sm animate-fade-up">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FiCreditCard className="text-red-600 text-xl" />
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

  // Filter out exam fees and standard admission fees, but keep re-admission fees, or general query search
  const filteredFees = fees.filter((fee) => {
    const isExamOrAdmission = (fee.title.toLowerCase().startsWith('exam fee') || fee.title.toLowerCase().startsWith('admission fee')) && !fee.title.toLowerCase().includes('re-admission');
    if (isExamOrAdmission) return false;

    if (searchQuery) {
      return (
        fee.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fee.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fee.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiDollarSign className="text-primary animate-pulse" /> Monthly Tuition & Fees Cashier Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review auto-generated monthly student tuition invoices and collect student fee payments.
          </p>
        </div>
      </div>

      {/* Record Payment Dialog */}
      {recordingPaymentFee && (
        <form onSubmit={handleRecordPayment} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col gap-5 animate-fade-down">
          <div>
            <h2 className="text-base font-bold text-slate-850 flex items-center gap-1.5">
              <FiCreditCard className="text-primary" /> Record Student Payment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log manual transaction for student <strong>{recordingPaymentFee.student_name}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount to Pay (BDT) *</label>
              <input
                type="number"
                step="0.01"
                required
                max={(parseFloat(recordingPaymentFee.amount) - parseFloat(recordingPaymentFee.paid_amount)).toFixed(2)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
              <span className="text-[10px] text-slate-450 font-semibold px-0.5">
                Outstanding: ৳{(parseFloat(recordingPaymentFee.amount) - parseFloat(recordingPaymentFee.paid_amount)).toFixed(2)}
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
              disabled={submitting}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? 'Processing Payment...' : 'Confirm Receipt Payment'}
            </button>
          </div>
        </form>
      )}

      {/* Selectors / Filters */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col lg:flex-row items-center gap-4">
        {/* Search */}
        <div className="w-full lg:flex-1 relative">
          <FiSearch className="absolute left-4 top-3.5 text-slate-400 text-base" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-primary"
          />
        </div>

        {/* Dropdowns */}
        <div className="w-full lg:w-fit flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-56 flex flex-col gap-1">
            <select
              value={filterClassId}
              onChange={(e) => {
                setFilterClassId(e.target.value);
                setFilterStudentId('');
              }}
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

          <div className="w-full sm:w-56 flex flex-col gap-1">
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-pointer"
            >
              <option value="">All Students...</option>
              {students
                .filter((s) => !filterClassId || s.class_id.toString() === filterClassId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.registration_number})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        {filteredFees.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-5xl mb-3">💵</span>
            <h3 className="text-sm font-bold text-slate-655">No Invoices Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              No student fee logs or monthly invoices correspond to filters.
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
                          {new Date(fee.due_date).toLocaleDateString()}
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
                              setShowAddInvoice(false);
                            }}
                            className="text-xs font-bold text-sky-650 hover:text-primary bg-primary-light hover:bg-primary-light px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <FiCreditCard className="text-xs" /> Record Pay
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-semibold px-2">Cleared</span>
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

export default CashierMonthlyFeePage;

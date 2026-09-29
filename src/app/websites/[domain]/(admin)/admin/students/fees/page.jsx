'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiDollarSign,
  FiPlus,
  FiX,
  FiUsers,
  FiCreditCard,
  FiAlertTriangle,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiFileText
} from 'react-icons/fi';

const AdminStudentFeesPage = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [fines, setFines] = useState([]);

  // Filter selections
  const [filterClassId, setFilterClassId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');

  // Invoice creation modal states
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [invTitle, setInvTitle] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invClassId, setInvClassId] = useState('');
  const [invStudentId, setInvStudentId] = useState('');
  const [invStudentsList, setInvStudentsList] = useState([]);

  // Payment modal state
  const [recordingPaymentFee, setRecordingPaymentFee] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Fine modal state
  const [applyingFineStudent, setApplyingFineStudent] = useState(null);
  const [fineTitle, setFineTitle] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [linkedFeeId, setLinkedFeeId] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial lookup lists
  const fetchInitialData = async () => {
    try {
      const classesRes = await fetch('/api/classes');
      const classesData = await classesRes.json();
      setClasses(classesData.paylod?.classes || []);

      // Fetch all students (including unregistered/re-admission candidates)
      const studentsRes = await fetch('/api/students');
      const studentsData = await studentsRes.json();
      setStudents(studentsData.paylod?.students || []);
    } catch (err) {
      toast.error('Failed to load classes or student roster.');
    }
  };

  // Fetch fees log list
  const fetchFeesAndFines = async () => {
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

      let finesUrl = '/api/students/fines';
      if (filterStudentId) finesUrl += `?student_id=${filterStudentId}`;
      const finesRes = await fetch(finesUrl);
      const finesData = await finesRes.json();
      setFines(finesData.paylod?.fines || []);
    } catch (err) {
      toast.error('Failed to retrieve financial logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchFeesAndFines();
  }, [filterClassId, filterStudentId]);

  // Fetch students for Invoice creation dropdown based on class selection
  useEffect(() => {
    if (!invClassId) {
      setInvStudentsList([]);
      setInvStudentId('');
      return;
    }
    const fetchClassStudents = async () => {
      try {
        const res = await fetch(`/api/students?class_id=${invClassId}`);
        const data = await res.json();
        setInvStudentsList(data.paylod?.students || []);
        setInvStudentId('');
      } catch (err) {
        console.error('Failed to load class students', err);
      }
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
      toast.error('Target Class or individual Student assignment is required.');
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

      toast.success(data.message || 'Fee invoices generated successfully!');
      setInvTitle('');
      setInvAmount('');
      setInvDueDate('');
      setInvClassId('');
      setInvStudentId('');
      setShowAddInvoice(false);
      fetchFeesAndFines();
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
          paid_amount: paymentAmount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment.');

      toast.success(data.message || 'Payment logged successfully.');
      setRecordingPaymentFee(null);
      setPaymentAmount('');
      fetchFeesAndFines();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Fine Logger
  const handleApplyFine = async (e) => {
    e.preventDefault();
    if (!fineTitle || !fineAmount) {
      toast.error('Fine description and Amount are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: applyingFineStudent.student_id,
          fee_id: linkedFeeId || null,
          title: fineTitle,
          amount: fineAmount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log fine.');

      toast.success(data.message || 'Fine applied successfully!');
      setApplyingFineStudent(null);
      setFineTitle('');
      setFineAmount('');
      setLinkedFeeId('');
      fetchFeesAndFines();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle fine status
  const handleToggleFineStatus = async (fineId, currentStatus) => {
    const nextStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const res = await fetch('/api/students/fines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fine_id: fineId, status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      fetchFeesAndFines();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Summary Metrics
  const totalBilled = fees.reduce((acc, f) => acc + (parseFloat(f.amount) || 0), 0);
  const totalPaid = fees.reduce((acc, f) => acc + (parseFloat(f.paid_amount) || 0), 0);
  const totalDue = totalBilled - totalPaid;
  const unpaidFinesCount = fines.filter((fn) => fn.status !== 'Paid').length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiDollarSign className="text-primary" /> Student Fees & Financial Ledgers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue student invoices, collect fee payments, and manage penalties.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddInvoice(!showAddInvoice);
            setRecordingPaymentFee(null);
            setApplyingFineStudent(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          {showAddInvoice ? (
            <>
              <FiX className="text-sm" /> Close Invoice Form
            </>
          ) : (
            <>
              <FiPlus className="text-sm" /> Issue New Invoice
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Invoices</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-slate-800">{fees.length}</span>
            <FiFileText className="text-slate-400 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Billed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-slate-800">৳{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
            <FiCreditCard className="text-slate-400 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Collected</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-emerald-600">৳{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
            <FiCheckCircle className="text-emerald-500 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Due</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg font-bold text-rose-600">৳{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
            <FiClock className="text-rose-400 text-sm" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold min-w-max">
          <FiFilter className="text-primary text-sm" /> Filter Ledgers:
        </div>

        <div className="w-full sm:w-1/2">
          <select
            value={filterClassId}
            onChange={(e) => {
              setFilterClassId(e.target.value);
              setFilterStudentId('');
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
          >
            <option value="">All Academic Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-1/2">
          <select
            value={filterStudentId}
            onChange={(e) => {
              setFilterStudentId(e.target.value);
              setFilterClassId('');
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer"
          >
            <option value="">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.registration_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issue Invoice Form Panel */}
      {showAddInvoice && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FiFileText className="text-primary" /> Issue New Invoice (Class-wide or Student)
            </h2>
            <button onClick={() => setShowAddInvoice(false)} className="text-slate-400 hover:text-slate-600">
              <FiX className="text-base" />
            </button>
          </div>

          <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Invoice Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Monthly Tuition Fee"
                value={invTitle}
                onChange={(e) => setInvTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Amount (৳) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Due Date *</label>
              <input
                type="date"
                required
                value={invDueDate}
                onChange={(e) => setInvDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Target Class *</label>
              <select
                value={invClassId}
                onChange={(e) => setInvClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white"
              >
                <option value="">Select class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Individual Student (Optional)</label>
              <select
                value={invStudentId}
                onChange={(e) => setInvStudentId(e.target.value)}
                disabled={!invClassId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white disabled:opacity-50"
              >
                <option value="">All Students in Class...</option>
                {invStudentsList.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.registration_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddInvoice(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {submitting ? 'Issuing...' : 'Generate Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Payment Form Modal Overlay */}
      {recordingPaymentFee && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FiCreditCard className="text-emerald-600" /> Record Payment Transaction
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Invoice: <strong>{recordingPaymentFee.title}</strong> for <strong>{recordingPaymentFee.student_name}</strong> (Total Due: ৳{recordingPaymentFee.amount})
              </p>
            </div>
            <button onClick={() => setRecordingPaymentFee(null)} className="text-slate-400 hover:text-slate-600">
              <FiX className="text-base" />
            </button>
          </div>

          <form onSubmit={handleRecordPayment} className="flex flex-col sm:flex-row items-end gap-3 max-w-xl">
            <div className="flex flex-col gap-1 flex-1 w-full">
              <label className="text-[11px] font-semibold text-slate-500">Paid Amount (৳) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setRecordingPaymentFee(null)}
                className="px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {submitting ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Apply Fine Form Modal Overlay */}
      {applyingFineStudent && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FiAlertTriangle className="text-rose-500" /> Apply Fine Penalty
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Student: <strong>{applyingFineStudent.student_name}</strong> ({applyingFineStudent.registration_number})
              </p>
            </div>
            <button onClick={() => setApplyingFineStudent(null)} className="text-slate-400 hover:text-slate-600">
              <FiX className="text-base" />
            </button>
          </div>

          <form onSubmit={handleApplyFine} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Fine Reason / Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Late Library Return"
                value={fineTitle}
                onChange={(e) => setFineTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Fine Amount (৳) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">Link to Invoice (Optional)</label>
              <select
                value={linkedFeeId}
                onChange={(e) => setLinkedFeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white"
              >
                <option value="">General Fine (Unlinked)</option>
                {fees
                  .filter((f) => f.student_id === applyingFineStudent.student_id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} (৳{f.amount})
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApplyingFineStudent(null)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {submitting ? 'Applying...' : 'Apply Fine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Grid: Fees Invoices & Fines Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fees Invoices Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Fee Invoices ({fees.length})
            </h2>
          </div>

          {loading ? (
            <div className="w-full py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium text-slate-400">Loading billing ledgers...</span>
            </div>
          ) : fees.length === 0 ? (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
              <FiFileText className="text-slate-300 text-3xl mb-2" />
              <p className="text-xs font-semibold text-slate-600">No Invoices Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No invoices match the selected filter criteria.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Invoice Title</th>
                    <th className="px-4 py-3">Financials</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {fees.map((fee) => {
                    const statusLower = (fee.status || '').toLowerCase();
                    return (
                      <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{fee.student_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {fee.registration_number} • Class {fee.class_name}
                          </p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                          {fee.title}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          <p>Due: <span className="font-semibold text-slate-800">৳{fee.amount}</span></p>
                          <p className="text-[11px]">Paid: <span className="font-semibold text-emerald-600">৳{fee.paid_amount}</span></p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${
                            statusLower === 'paid'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : statusLower === 'partially paid'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {fee.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                          {statusLower !== 'paid' && (
                            <button
                              onClick={() => {
                                setRecordingPaymentFee(fee);
                                setApplyingFineStudent(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Collect
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setApplyingFineStudent(fee);
                              setRecordingPaymentFee(null);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Fine
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fines Ledger Panel (1/3 width) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FiAlertTriangle className="text-rose-500" /> Fine Penalties ({fines.length})
            </h2>
            {unpaidFinesCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full border border-rose-100">
                {unpaidFinesCount} Unpaid
              </span>
            )}
          </div>

          {loading ? (
            <div className="w-full py-12 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : fines.length === 0 ? (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
              <FiAlertTriangle className="text-slate-300 text-2xl mb-1" />
              <p className="text-xs font-semibold text-slate-500">No Fines Logged</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {fines.map((fine) => (
                <div key={fine.id} className="p-3.5 hover:bg-slate-50/50 transition-colors space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{fine.title}</p>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                      fine.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {fine.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium">
                    {fine.student_name} ({fine.registration_number})
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-bold text-rose-600">৳{fine.amount}</span>
                    <button
                      onClick={() => handleToggleFineStatus(fine.id, fine.status)}
                      className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Set {fine.status === 'Paid' ? 'Unpaid' : 'Paid'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AdminStudentFeesPage;

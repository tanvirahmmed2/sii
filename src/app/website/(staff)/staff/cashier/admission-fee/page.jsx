'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiUsers, FiDollarSign, FiSearch, FiSliders, FiCheck, FiClock, FiAlertOctagon, FiCreditCard, FiX } from 'react-icons/fi';

const AdmissionFeeDesk = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Payment collection modal states
  const [collectingPaymentAdm, setCollectingPaymentAdm] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    const initData = async () => {
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
          const admRes = await fetch('/api/admin/students/admissions');
          if (admRes.ok) {
            const admData = await admRes.json();
            setAdmissions(admData.paylod?.admissions || []);
          }

          const classesRes = await fetch('/api/classes');
          if (classesRes.ok) {
            const classesData = await classesRes.json();
            setClasses(classesData.paylod?.classes || []);
          }
        }
      } catch (err) {
        toast.error('Failed to load admission fee ledger.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleUpdateStatus = async (student_admission_id, nextStatus) => {
    setUpdatingId(student_admission_id);
    try {
      const res = await fetch('/api/admin/students/admissions/fee-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_admission_id, status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update fee status');
      toast.success(`Fee status updated to ${nextStatus}!`);

      // Update state locally
      setAdmissions(prev => 
        prev.map(adm => 
          adm.id === student_admission_id ? { ...adm, fee_status: nextStatus } : adm
        )
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCollectAdmissionPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/admin/students/admissions/fee-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_admission_id: collectingPaymentAdm.id,
          status: 'paid',
          amount_paid: paymentAmount,
          payment_method: paymentMethod,
          transaction_id: transactionId,
          remarks: remarks
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process payment.');

      toast.success('Admission fee payment processed and registered successfully!');
      
      // Update state locally
      setAdmissions(prev => 
        prev.map(adm => 
          adm.id === collectingPaymentAdm.id ? { ...adm, fee_status: 'paid' } : adm
        )
      );

      setCollectingPaymentAdm(null);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setTransactionId('');
      setRemarks('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-slate-400">Loading admissions billing...</span>
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
          <p className="text-xs text-red-655 text-red-600 mt-1">
            This module is restricted to the <strong>Cashier</strong> role only.
          </p>
        </div>
      </div>
    );
  }

  // Filter admissions
  const filteredAdmissions = admissions.filter(adm => {
    const q = searchQuery.toLowerCase().trim();
    const appNum = `app-1000${adm.id}`;
    const matchesSearch = adm.applicant_name.toLowerCase().includes(q) ||
                          adm.email.toLowerCase().includes(q) ||
                          adm.phone.includes(q) ||
                          appNum.includes(q) ||
                          adm.id.toString() === q;
    const matchesClass = filterClass === '' || adm.applied_class_id.toString() === filterClass;
    
    const normalizedFeeStatus = (adm.fee_status || 'Pending').toLowerCase();
    const matchesStatus = filterStatus === '' || normalizedFeeStatus === filterStatus.toLowerCase();

    return matchesSearch && matchesClass && matchesStatus;
  });

  const totalFeesAmount = admissions.reduce((sum, adm) => sum + parseFloat(adm.admission_fees_amount || adm.fee_amount || 0), 0);
  const paidFees = admissions.filter(adm => (adm.fee_status || 'Pending').toLowerCase() === 'paid');
  const paidFeesAmount = paidFees.reduce((sum, adm) => sum + parseFloat(adm.admission_fees_amount || adm.fee_amount || 0), 0);
  const pendingFeesAmount = totalFeesAmount - paidFeesAmount;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FiUsers className="text-primary" /> Admission Fees Desk
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review candidate registration fee collection status, update payments, and manage admissions billing ledger.
        </p>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Fee Roster</span>
            <span className="text-2xl font-semibold text-slate-800">৳{totalFeesAmount.toFixed(2)}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <FiDollarSign className="text-slate-500 text-lg" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Total Fees Collected</span>
            <span className="text-2xl font-semibold text-primary">৳{paidFeesAmount.toFixed(2)}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-light flex items-center justify-center">
            <FiCheck className="text-primary text-lg" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Outstanding Fees</span>
            <span className="text-2xl font-semibold text-amber-600">৳{pendingFeesAmount.toFixed(2)}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <FiClock className="text-amber-600 text-lg" />
          </div>
        </div>
      </div>

      {/* Payment details collector form */}
      {collectingPaymentAdm && (
        <form onSubmit={handleCollectAdmissionPayment} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col gap-5 animate-fade-down">
          <div>
            <h2 className="text-base font-bold text-slate-850 flex items-center gap-1.5">
              <FiCreditCard className="text-primary" /> Collect Admission Fee
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log admission fee cash/online payment collection for applicant <strong>{collectingPaymentAdm.applicant_name}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount Collected (BDT) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-primary"
              />
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
              onClick={() => setCollectingPaymentAdm(null)}
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

      {/* Search & Filters */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] flex flex-col lg:flex-row items-center gap-4">
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

        {/* Filters */}
        <div className="w-full lg:w-fit flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-44 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <FiSliders className="text-slate-400 text-sm" />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none cursor-pointer border-none"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-44 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <FiClock className="text-slate-400 text-sm" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none cursor-pointer border-none"
            >
              <option value="">All Fee Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        {filteredAdmissions.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-slate-300 text-5xl mb-3">📋</span>
            <h3 className="text-sm font-bold text-slate-655">No Admission Records</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              No applicant registers match the search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Applied Class</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Admission circular</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Fee amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Fee status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmissions.map((adm) => {
                  const normalizedStatus = (adm.fee_status || 'Pending').toLowerCase();
                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{adm.applicant_name}</span>
                          <span className="text-[10px] text-slate-400">{adm.email} &bull; {adm.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">{adm.class_name}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{adm.admission_title || 'General Admission'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">
                        ৳{parseFloat(adm.admission_fees_amount || adm.fee_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          normalizedStatus === 'paid' 
                            ? 'bg-primary-light text-primary border border-primary-light'
                            : normalizedStatus === 'cancelled'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {normalizedStatus === 'paid' ? <FiCheck /> : <FiClock />}
                          <span className="capitalize">{normalizedStatus}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {normalizedStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/60">
                            <FiCheck className="text-sm" /> Payment Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setCollectingPaymentAdm(adm);
                              setPaymentAmount(parseFloat(adm.admission_fees_amount || adm.fee_amount || 0).toFixed(2));
                            }}
                            disabled={updatingId === adm.id}
                            className="text-xs font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 border border-emerald-200 shadow-2xs"
                          >
                            <FiCreditCard className="text-xs" /> Collect &amp; Mark Paid
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

export default AdmissionFeeDesk;

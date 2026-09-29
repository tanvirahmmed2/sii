'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiSearch, FiDollarSign, FiClock, FiCheck, FiInfo, FiLayers, FiAlertCircle, FiPrinter } from 'react-icons/fi';
import { printStudentFeeReceipt } from '@/lib/receipts/student_fee';

const PublicPaymentsPage = () => {
  const [regNo, setRegNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!regNo.trim()) {
      toast.error('Please enter a registration number.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/public/payments?reg_no=${encodeURIComponent(regNo.trim())}`);
      const resData = await res.json();

      if (res.ok && resData.success) {
        setData(resData.paylod);
      } else {
        setData(null);
        toast.error(resData.error || 'Student not found.');
      }
    } catch (err) {
      setData(null);
      toast.error('An error occurred while fetching billing details.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Outstanding Balances
  const getSummary = () => {
    if (!data) return { totalOutstanding: 0, totalPaid: 0 };
    const { fees, fines } = data;

    const unpaidFees = fees
      .filter((f) => (f.status || '').toLowerCase() !== 'paid')
      .reduce((sum, f) => sum + (parseFloat(f.amount) - parseFloat(f.paid_amount || 0)), 0);

    const unpaidFines = fines
      .filter((f) => (f.status || '').toLowerCase() !== 'paid')
      .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

    const paidFees = fees
      .reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);

    return {
      totalOutstanding: unpaidFees + unpaidFines,
      totalPaid: paidFees
    };
  };

  const summary = getSummary();

  const getStatusBadge = (status) => {
    const norm = (status || 'unpaid').toLowerCase();
    switch (norm) {
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><FiCheck /> Paid</span>;
      case 'partially paid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">Partially Paid</span>;
      case 'unpaid':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100"><FiClock /> Unpaid</span>;
    }
  };

  return (
    <div className="w-full min-h-[70vh] py-12 px-4 md:px-8 max-w-5xl mx-auto flex flex-col gap-8 animate-fade-up">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <FiDollarSign className="text-primary" /> Verify Student Bills
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Enter your official student Registration Number to verify current tuition statement logs, invoices, and pending fee dues.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="w-full max-w-xl mx-auto">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-3.5 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Enter Student Registration Number (e.g. 2026-6001)..."
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-2xl text-sm font-bold shadow-md shadow-sky-500/10 hover:shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Searching...' : 'Search Details'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">Retrieving statement logs...</span>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Roster & Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Info Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Student Details</span>
                <h2 className="text-lg font-semibold text-slate-800">{data.student.name}</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Reg: {data.student.registration_number}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <FiLayers className="text-slate-400" />
                Class: <strong className="text-primary">{data.student.class_name}</strong>
              </div>
            </div>

            {/* Outstanding Balance Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Outstanding Balance</span>
                <span className={`text-2xl font-semibold ${summary.totalOutstanding > 0 ? 'text-rose-650 text-rose-600' : 'text-slate-800'}`}>
                  ৳{summary.totalOutstanding.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-450 mt-1 font-semibold">Includes pending monthly/exam fees & fines</p>
              </div>
              <div className={`p-3.5 rounded-2xl ${summary.totalOutstanding > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                <FiClock className="text-xl" />
              </div>
            </div>

            {/* Total Paid Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Paid Invoices</span>
                <span className="text-2xl font-semibold text-primary">
                  ৳{summary.totalPaid.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-450 mt-1 font-semibold">Cleared fees recorded dynamically</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-primary-light text-primary border border-primary-light">
                <FiCheck className="text-xl" />
              </div>
            </div>
          </div>

          {/* Detailed Ledger List */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-1.5">
              📋 Fees & Fines Invoice Ledger
            </h3>

            {data.fees.length === 0 && data.fines.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <FiInfo className="text-3xl text-slate-300" />
                <p className="text-xs font-semibold">No active billing transactions logged for this student.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Tuition & Custom Fees Table */}
                {data.fees.length > 0 && (
                  <div className="w-full">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tuition & Exam Fees</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Fee Description</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Due Date</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-right">Fee Due</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-right">Paid</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Status</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {data.fees.map((fee) => (
                            <tr key={fee.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-700">{fee.title}</td>
                              <td className="px-5 py-3.5 text-slate-500">{new Date(fee.due_date).toLocaleDateString()}</td>
                              <td className="px-5 py-3.5 text-right font-bold text-slate-900">৳{parseFloat(fee.amount).toFixed(2)}</td>
                              <td className="px-5 py-3.5 text-right text-primary font-bold">৳{parseFloat(fee.paid_amount || 0).toFixed(2)}</td>
                              <td className="px-5 py-3.5">{getStatusBadge(fee.status)}</td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => printStudentFeeReceipt(fee, data?.student || fee)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                >
                                  <FiPrinter className="text-xs" /> Print Receipt
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Fines Log */}
                {data.fines.length > 0 && (
                  <div className="w-full border-t border-slate-50 pt-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Institutional Fines</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Fine Reason</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Assigned Date</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-right">Fine Amount</th>
                            <th className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {data.fines.map((fine) => (
                            <tr key={fine.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-700">{fine.title}</td>
                              <td className="px-5 py-3.5 text-slate-500">{new Date(fine.created_at).toLocaleDateString()}</td>
                              <td className="px-5 py-3.5 text-right font-bold text-slate-900">৳{parseFloat(fine.amount).toFixed(2)}</td>
                              <td className="px-5 py-3.5">{getStatusBadge(fine.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : hasSearched ? (
        <div className="w-full max-w-md mx-auto p-8 bg-rose-50 border border-rose-100 rounded-3xl text-center flex flex-col items-center gap-3 animate-fade-up">
          <FiAlertCircle className="text-rose-550 text-rose-500 text-3xl" />
          <div>
            <h3 className="text-sm font-bold text-rose-800">No Student Found</h3>
            <p className="text-xs text-rose-650 mt-1">
              Double-check the registration number and try again.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto p-8 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400 flex flex-col items-center gap-2 animate-fade-up">
          <span>💳</span>
          <p className="text-xs font-semibold">Submit a student registration number above to begin lookup.</p>
        </div>
      )}
    </div>
  );
};

export default PublicPaymentsPage;

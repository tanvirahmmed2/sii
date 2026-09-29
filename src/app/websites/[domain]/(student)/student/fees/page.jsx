'use client';

import React, { useEffect, useState } from 'react';
import { FiDollarSign, FiClock, FiCheck, FiInfo, FiPrinter, FiAlertCircle } from 'react-icons/fi';
import { printStudentFeeReceipt } from '@/lib/receipts/student_fee';

const FeesPage = () => {
  const [data, setData] = useState({ fees: [], fines: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await fetch('/api/student/fees');
        if (res.ok) {
          const resData = await res.json();
          setData(resData.paylod || { fees: [], fines: [] });
        }
      } catch (error) {
        console.error('Error fetching fees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading fee records...</p>
      </div>
    );
  }

  const { fees = [], fines = [] } = data;

  // Calculate summary stats
  const totalUnpaidFees = fees
    .filter((f) => (f.status || '').toLowerCase() !== 'paid')
    .reduce((sum, f) => sum + (parseFloat(f.amount) - parseFloat(f.paid_amount || 0)), 0);

  const totalUnpaidFines = fines
    .filter((f) => (f.status || '').toLowerCase() !== 'paid')
    .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

  const totalOutstanding = totalUnpaidFees + totalUnpaidFines;

  const totalPaid = fees
    .reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);

  const stats = [
    { 
      label: 'Outstanding Balance', 
      value: `৳${totalOutstanding.toFixed(2)}`, 
      sub: totalOutstanding > 0 ? 'Pending payment dues' : 'No outstanding dues',
      color: totalOutstanding > 0 ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-slate-50 text-slate-700 border-slate-200/60', 
      icon: FiClock 
    },
    { 
      label: 'Total Paid Fees', 
      value: `৳${totalPaid.toFixed(2)}`, 
      sub: 'Total cleared transactions',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', 
      icon: FiCheck 
    }
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
      case 'partially paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            Partially Paid
          </span>
        );
      case 'unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
            <FiClock className="text-xs" /> Unpaid
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FiDollarSign /> Financial Ledger
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Fees & Penalties</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
            Track tuition fee ledgers, payment history, receipts, and institutional fines.
          </p>
        </div>
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

      {/* Tuition Fees Table */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiDollarSign className="text-emerald-600" /> Tuition & Institutional Fees
            </h2>
            <p className="text-xs text-slate-400 font-medium">Semester tuition and recurring academic fees</p>
          </div>
        </div>

        {fees.length === 0 ? (
          <p className="text-slate-400 text-xs font-medium text-center py-8 border border-dashed border-slate-200 rounded-2xl">
            No tuition or semester fees logged.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fee Description</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {fee.title}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                      {new Date(fee.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(fee.status)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 text-right">
                      ৳{parseFloat(fee.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700 text-right">
                      ৳{parseFloat(fee.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => printStudentFeeReceipt(fee, data.student || fee)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        <FiPrinter className="text-xs" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fines Table */}
      <div className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiAlertCircle className="text-amber-500" /> Penalties & Fines
            </h2>
            <p className="text-xs text-slate-400 font-medium">Late fees or disciplinary penalties</p>
          </div>
        </div>

        {fines.length === 0 ? (
          <p className="text-slate-400 text-xs font-medium text-center py-8 border border-dashed border-slate-200 rounded-2xl">
            No fines or late penalties logged.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fine Description</th>
                  <th className="py-3 px-4">Date Charged</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {fines.map((fine) => (
                  <tr key={fine.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {fine.title}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                      {new Date(fine.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(fine.status)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-rose-700 text-right">
                      ৳{parseFloat(fine.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeesPage;

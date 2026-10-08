'use client';

import React, { useState, useContext } from 'react';
import { toast } from 'react-hot-toast';
import { printStudentFeeReceipt } from 'src/lib/receipts/student_fee';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const PublicPaymentsPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
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
      const res = await fetch(`${getApiEndpoint('public/payments')}?reg_no=${encodeURIComponent(regNo.trim())}`);
      const resData = await res.json();

      if (res.ok && resData.success) {
        setData(resData.paylod);
      } else {
        setData(null);
        toast.error(resData.error || 'Student records not found.');
      }
    } catch {
      setData(null);
      toast.error('An error occurred while fetching billing details.');
    } finally {
      setLoading(false);
    }
  };

  const getSummary = () => {
    if (!data) return { totalOutstanding: 0, totalPaid: 0 };
    const { fees = [], fines = [] } = data;

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
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Paid</span>;
      case 'partially paid':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Partially Paid</span>;
      case 'unpaid':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Unpaid</span>;
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Accounts & Dues Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Student Billing & Payments Ledger
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Query student tuition statements, monthly rate invoices, fine assessments, and official receipts.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded shadow-xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Student Registration Number *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Student Registration Number (e.g. 2026-6001)..."
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-primary"
              />
            </div>
            <div className="sm:self-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Searching Ledger...' : 'Search Invoices'}
              </button>
            </div>
          </form>
        </div>

        {/* Result Area */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Retrieving student billing transactions...
            </span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Student Profile
                </span>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {data.student.name}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                  <p>Reg: <strong className="text-slate-800 dark:text-slate-200 font-medium">{data.student.registration_number}</strong></p>
                  <p>Class: <strong className="text-slate-800 dark:text-slate-200 font-medium">{data.student.class_name}</strong></p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Outstanding Balance
                </span>
                <span className={`text-2xl font-semibold mt-1 block ${summary.totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  ৳{summary.totalOutstanding.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Total unpaid tuition and fine assessments
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Total Paid
                </span>
                <span className="text-2xl font-semibold text-primary mt-1 block">
                  ৳{summary.totalPaid.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Cleared payments recorded in institutional ledger
                </p>
              </div>

            </div>

            {/* Tuition & Invoices Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Tuition & Academic Fees Invoices
                </h3>
              </div>

              {data.fees.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No tuition invoices logged for this student.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-2.5 font-medium">Description</th>
                        <th className="px-4 py-2.5 font-medium">Due Date</th>
                        <th className="px-4 py-2.5 font-medium text-right">Fee Due</th>
                        <th className="px-4 py-2.5 font-medium text-right">Paid</th>
                        <th className="px-4 py-2.5 font-medium text-center">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {data.fees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{fee.title}</td>
                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{new Date(fee.due_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 text-right font-medium">৳{parseFloat(fee.amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-primary">৳{parseFloat(fee.paid_amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center">{getStatusBadge(fee.status)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => printStudentFeeReceipt(fee, data?.student || fee)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Print
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
            {data.fines.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Disciplinary & Administrative Fines
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-2.5 font-medium">Fine Reason</th>
                        <th className="px-4 py-2.5 font-medium">Date Assessed</th>
                        <th className="px-4 py-2.5 font-medium text-right">Fine Amount</th>
                        <th className="px-4 py-2.5 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {data.fines.map((fine) => (
                        <tr key={fine.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{fine.title}</td>
                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{new Date(fine.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 text-right font-medium">৳{parseFloat(fine.amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center">{getStatusBadge(fine.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        ) : hasSearched ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded text-center">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Student Account Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              No fee ledger records found for registration number {regNo}.
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
};

export default PublicPaymentsPage;

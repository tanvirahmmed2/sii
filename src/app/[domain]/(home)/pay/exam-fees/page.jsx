'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import UniversalGatewayCheckout from 'src/component/payment/UniversalGatewayCheckout';

export default function ExamFeesPayPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [studentId, setStudentId] = useState('');
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal State
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!studentId.trim()) {
      toast.error('Please enter a Student ID, Roll Number, or Exam Registration Number.');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setData(null);

    try {
      const endpoint = domain
        ? `/api/${domain}/pay/exam-fees?identifier=${encodeURIComponent(studentId.trim())}`
        : `/api/pay/exam-fees?identifier=${encodeURIComponent(studentId.trim())}`;

      const res = await fetch(endpoint);
      const resJson = await res.json();

      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Student exam fee records not found.');
      }

      setData(resJson);
    } catch (err) {
      toast.error(err.message || 'Lookup failed.');
      setData(null);
    } finally {
      setSearching(false);
    }
  };

  const openPay = (inv) => {
    setActiveInvoice(inv);
    setCheckoutOpen(true);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        {/* 1. Header & Navigation */}
        <div className="flex flex-col items-start gap-2 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link
              href="/pay"
              className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              &larr; Central Pay Portal
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
              Examination Clearance
            </span>
          </div>
          <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight">
                Examination Fees &amp; Admit Card Clearance
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-light mt-1">
                Settle midterm, final semester, and backlog examination dues. Admit card issuance is automatically unlocked upon verification.
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Admit Issuance
              </span>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Auto-Enabled on Paid
              </div>
            </div>
          </div>
        </div>

        {/* Search Input Form Card */}
        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block mb-1">
              Candidate Verification
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
              Lookup Student Exam Records
            </h2>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter Student ID (e.g. STU-2026-001), Roll No, or Exam Registration No..."
              className="input-style w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button
              type="submit"
              disabled={searching}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 shrink-0"
            >
              {searching ? 'Checking...' : 'Check Exam Dues'}
            </button>
          </form>
        </div>

        {/* 2. Dues Results */}
        {hasSearched && (
          <div className="w-full space-y-6">
            {data?.student ? (
              <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                {/* Candidate Bio Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-primary block mb-1">Exam Candidate</div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white">
                      {data.student.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-light">
                      <span>ID: <strong className="font-mono font-medium text-slate-900 dark:text-white">{data.student.student_unique_id}</strong></span>
                      <span>&bull;</span>
                      <span>Class: {data.student.class_name}</span>
                      <span>&bull;</span>
                      <span>Roll: {data.student.roll_no}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Total Exam Dues</div>
                    <div className="font-serif text-2xl sm:text-3xl font-normal text-secondary mt-0.5">
                      ৳{parseFloat(data.summary?.total_due_amount || 0).toFixed(2)} BDT
                    </div>
                  </div>
                </div>

                {/* Invoices Table */}
                {(!data.dues?.exam || data.dues.exam.length === 0) ? (
                  <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400 space-y-1 font-light">
                    <div className="font-serif text-lg text-slate-900 dark:text-white font-normal">All Exam Fees Settled</div>
                    <p>Your examination candidate entry is cleared. Admit card is active.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold tracking-wider">
                          <th className="pb-3 px-2">Invoice No</th>
                          <th className="pb-3 px-2">Examination Title</th>
                          <th className="pb-3 px-2">Admit Status</th>
                          <th className="pb-3 px-2">Payable Amount</th>
                          <th className="pb-3 px-2">Payment Status</th>
                          <th className="pb-3 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                        {data.dues.exam.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-2 font-mono text-slate-900 dark:text-white font-medium">
                              #{inv.invoice_no}
                            </td>
                            <td className="py-3.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                              {inv.title || 'Semester Examination Fee'}
                            </td>
                            <td className="py-3.5 px-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                              Locked until payment
                            </td>
                            <td className="py-3.5 px-2 font-mono font-medium text-slate-900 dark:text-white">
                              ৳{parseFloat(inv.net_due || inv.amount).toFixed(2)} BDT
                            </td>
                            <td className="py-3.5 px-2">
                              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-secondary/10 text-secondary border-secondary/20 uppercase">
                                {inv.payment_status}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => openPay(inv)}
                                className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-all shadow-xs hover:shadow-md cursor-pointer"
                              >
                                Clear Fee
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : !searching ? (
              <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-10 text-center space-y-2 shadow-xs">
                <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border bg-secondary/10 text-secondary border-secondary/20 uppercase tracking-wider">
                  Not Found
                </span>
                <h3 className="font-serif text-lg text-slate-900 dark:text-white mt-2">
                  No Record Matching &quot;{studentId}&quot;
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-light">
                  Please verify the Student ID or Roll number and try again.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 3. Checkout Modal */}
      <UniversalGatewayCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        invoice={activeInvoice}
        availableGateways={data?.available_gateways || []}
        domain={domain}
        apiEndpoint={domain ? `/api/${domain}/pay/exam-fees` : '/api/pay/exam-fees'}
        onPaymentSuccess={handleSearch}
      />
    </div>
  );
}

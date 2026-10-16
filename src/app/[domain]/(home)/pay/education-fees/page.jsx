'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiBookOpen,
  FiSearch,
  FiCreditCard,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiShield
} from 'react-icons/fi';
import UniversalGatewayCheckout from '@/component/payment/UniversalGatewayCheckout';

export default function EducationFeesPayPage() {
  const params = useParams();
  const domain = params?.domain || '';

  const [studentId, setStudentId] = useState('');
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!studentId.trim()) {
      toast.error('Please enter your Student ID or Roll Number.');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setData(null);

    try {
      const endpoint = domain
        ? `/api/${domain}/pay/education-fees?identifier=${encodeURIComponent(studentId.trim())}`
        : `/api/pay/education-fees?identifier=${encodeURIComponent(studentId.trim())}`;

      const res = await fetch(endpoint);
      const resJson = await res.json();

      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Student tuition record not found.');
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/pay"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition mb-4"
          >
            <FiArrowLeft /> Back to Central Pay Portal
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                <FiBookOpen className="w-3.5 h-3.5" />
                <span>Tuition & Academic Billing</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
                Education & Tuition Fees Payment
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter student ID or roll number to review unpaid monthly tuition, semester charges, and library dues.
              </p>
            </div>
          </div>
        </div>

        {/* Lookup Box */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter Student ID (e.g. STU-2026-001) or Roll / Reg..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {searching ? 'Querying...' : 'Find Student Invoices'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div>
            {data?.student ? (
              <div className="space-y-6">
                {/* Student Bio Strip */}
                <div className="p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Enrolled Student
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                      {data.student.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>ID: <strong>{data.student.student_unique_id}</strong></span>
                      <span>•</span>
                      <span>Class: <strong>{data.student.class_name}</strong></span>
                      <span>•</span>
                      <span>Roll: <strong>{data.student.roll_no}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Total Education Dues</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      ৳{data.summary?.total_due_amount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>

                {/* Invoices */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Outstanding Academic Invoices
                    </h4>
                    <span className="text-xs text-slate-400">
                      {data.dues?.education?.length || 0} unpaid invoice(s)
                    </span>
                  </div>

                  {(!data.dues?.education || data.dues.education.length === 0) ? (
                    <div className="p-10 text-center space-y-2">
                      <FiCheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">All Tuition Fees are Paid!</h4>
                      <p className="text-xs text-slate-500">No pending academic dues found for this student.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.dues.education.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-indigo-600">
                                #{inv.invoice_no}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 uppercase">
                                {inv.payment_status}
                              </span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                              {inv.title || 'Tuition Fee'}
                            </h5>
                            <div className="text-xs text-slate-400 flex items-center gap-3">
                              {inv.month_name && <span>Billing: {inv.month_name}</span>}
                              {inv.due_date && <span>Due Date: {new Date(inv.due_date).toLocaleDateString()}</span>}
                              {inv.fine_amount > 0 && <span className="text-rose-500">Fine: ৳{inv.fine_amount}</span>}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5">
                            <div className="text-right">
                              <div className="text-[11px] text-slate-400">Net Due</div>
                              <div className="text-lg font-black text-slate-900 dark:text-white">
                                ৳{parseFloat(inv.net_due).toFixed(2)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPay(inv)}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                            >
                              <FiCreditCard />
                              <span>Pay Fee</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : !searching ? (
              <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <FiAlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">No Student Record Found</h4>
                <p className="text-xs text-slate-500 mt-1">Please confirm the Student ID or Roll number.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Security Reassurance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
          <FiShield className="text-indigo-500" />
          <span>Real-time clearance connected to the institution&apos;s financial ledger.</span>
        </div>
      </div>

      <UniversalGatewayCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        invoice={activeInvoice}
        availableGateways={data?.available_gateways || []}
        domain={domain}
        apiEndpoint={domain ? `/api/${domain}/pay/education-fees` : '/api/pay/education-fees'}
        onPaymentSuccess={handleSearch}
      />
    </div>
  );
}

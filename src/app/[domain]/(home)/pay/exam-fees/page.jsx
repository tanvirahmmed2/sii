'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiFileText,
  FiSearch,
  FiCreditCard,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiAward,
  FiShield,
  FiDownload
} from 'react-icons/fi';
import UniversalGatewayCheckout from '@/component/payment/UniversalGatewayCheckout';

export default function ExamFeesPayPage() {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link
            href="/pay"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition mb-4"
          >
            <FiArrowLeft /> Back to Central Pay Portal
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                <FiFileText className="w-3.5 h-3.5" />
                <span>Examination Clearance & Admit Issuance</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
                Examination Fees Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Settle midterm, final semester, and backlog examination dues to activate your examination admit card.
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
                placeholder="Enter Student ID, Roll No, or Exam Registration No..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-7 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {searching ? 'Checking...' : 'Check Exam Dues'}
            </button>
          </form>
        </div>

        {/* Results */}
        {hasSearched && (
          <div>
            {data?.student ? (
              <div className="space-y-6">
                {/* Student Bio */}
                <div className="p-5 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Exam Candidate
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
                    <span className="text-xs text-slate-400">Total Exam Fees Due</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      ৳{data.summary?.total_due_amount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>

                {/* Exam Fee Items */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Examination Invoices
                    </h4>
                    <span className="text-xs text-slate-400">
                      {data.dues?.exam?.length || 0} examination entry(ies)
                    </span>
                  </div>

                  {(!data.dues?.exam || data.dues.exam.length === 0) ? (
                    <div className="p-10 text-center space-y-2">
                      <FiCheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">All Exam Fees are Settled!</h4>
                      <p className="text-xs text-slate-500">Your admit card has been activated and is ready.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.dues.exam.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-purple-600">
                                #{inv.invoice_no}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 uppercase">
                                {inv.payment_status}
                              </span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                              {inv.title || 'Semester Examination Fee'}
                            </h5>
                            <p className="text-xs text-slate-400">
                              Admit Card Status: <span className="text-rose-500 font-semibold">Locked until fee is cleared</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5">
                            <div className="text-right">
                              <div className="text-[11px] text-slate-400">Total Fee</div>
                              <div className="text-lg font-black text-slate-900 dark:text-white">
                                ৳{parseFloat(inv.net_due || inv.amount).toFixed(2)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPay(inv)}
                              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                            >
                              <FiCreditCard />
                              <span>Clear Exam Fee</span>
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
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">No Candidate Records Found</h4>
                <p className="text-xs text-slate-500 mt-1">Please confirm the Student ID or Roll number.</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
          <FiShield className="text-purple-500" />
          <span>Instant automatic admit card issuance upon successful payment verification.</span>
        </div>
      </div>

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

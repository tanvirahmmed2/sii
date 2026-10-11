'use client';

import React, { useState, useEffect } from 'react';
import {
  FiCheckCircle,
  FiSearch,
  FiPrinter,
  FiRefreshCw,
  FiCreditCard,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
} from 'react-icons/fi';
import { printStudentFeeReceipt } from 'src/lib/receipts/student_fee';

export default function PaymentEducationPaidPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total_collected: '0.00', paid_count: 0 });
  const [meta, setMeta] = useState({ classes: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  const loadMeta = async () => {
    try {
      const res = await fetch('/api/fees/education/meta');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setMeta({ classes: json.classes || [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPaidPayments = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        status: 'paid',
        class_id: selectedClass,
        search,
      });

      const res = await fetch(`/api/fees/education/payments?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPayments(json.data || []);
          setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
          if (json.stats) setStats(json.stats);
        }
      }
    } catch (err) {
      console.error('Error loading paid payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadPaidPayments(1);
  }, [selectedClass]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadPaidPayments(1);
  };

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FiCheckCircle /> Cleared Transactions Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Paid Education Fees
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Verified fee transactions settled through online channels (bKash, Nagad, Cards) or office cash desks.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 flex items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
              Total Realized Collections
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-200 font-mono">
              ৳{parseFloat(stats.total_collected || 0).toLocaleString()}
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-mono">
            {stats.paid_count} Cleared
          </span>
        </div>
      </div>

      {/* Main Table Workstation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search paid invoice, student name, or transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">All Classes</option>
              {meta.classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadPaidPayments(pagination.page)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-medium">Loading settled payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <FiCheckCircle className="text-3xl text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No settled fee payments found</p>
            <p className="text-xs text-slate-400 mt-0.5">Cleared payments and student portal online settlements will be logged here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice # & Date</th>
                  <th className="py-3 px-4">Student & Class</th>
                  <th className="py-3 px-4">Fee Title & Cycle</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 font-mono">Transaction ID</th>
                  <th className="py-3 px-4 text-right">Settled Amount</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-900 dark:text-white">
                      <span className="font-bold block">{p.invoice_no}</span>
                      <span className="text-[10px] text-slate-400">
                        {p.paid_date ? new Date(p.paid_date).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <span className="font-bold block">{p.student_name}</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                        {p.class_name} • Roll: {p.roll_no || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>{p.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal block">{p.month_name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <FiCreditCard className="text-xs" /> {p.payment_method || 'Online'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {p.transaction_id || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-700 dark:text-emerald-400 font-bold text-right text-xs">
                      ৳{parseFloat(p.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          printStudentFeeReceipt(
                            { ...p, type: 'Education Fee' },
                            { name: p.student_name, roll_no: p.roll_no, registration_no: p.registration_no }
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        <FiPrinter className="text-xs" /> Voucher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadPaidPayments(pagination.page - 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              >
                <FiChevronLeft />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadPaidPayments(pagination.page + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

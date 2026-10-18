'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import UniversalGatewayCheckout from 'src/component/payment/UniversalGatewayCheckout';

export default function ResidentialFeesPayPage() {
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
      toast.error('Please enter a Student ID, Roll Number, or Hall Seat Number.');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setData(null);

    try {
      const endpoint = domain
        ? `/api/${domain}/pay/residential-fees?identifier=${encodeURIComponent(studentId.trim())}`
        : `/api/pay/residential-fees?identifier=${encodeURIComponent(studentId.trim())}`;

      const res = await fetch(endpoint);
      const resJson = await res.json();

      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Student residential fee records not found.');
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-4 sm:p-5 space-y-4">
      {/* 1. Header & Navigation */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/pay"
                className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                &larr; Central Pay Portal
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-primary/10 text-primary-dark border-primary/20 uppercase tracking-wider">
                Residential &amp; Hall Fees
              </span>
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Hall &amp; Dormitory Seat Rent Clearance
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review monthly dormitory seat rent, hall development dues, and utility charges. Settle online to update allocation records.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Ledger Unit</span>
            <div className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
              BDT (৳)
            </div>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter Student ID, Roll No, or Hall Seat Number..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={searching}
            className="w-full sm:w-auto px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {searching ? 'Querying...' : 'Find Hall Dues'}
          </button>
        </form>
      </div>

      {/* 2. Dues Results */}
      {hasSearched && (
        <div className="w-full space-y-4">
          {data?.student ? (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Residential Student</div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                    {data.student.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>ID: <strong className="font-mono font-medium text-slate-800 dark:text-slate-200">{data.student.student_unique_id}</strong></span>
                    <span>•</span>
                    <span>Class: {data.student.class_name}</span>
                    <span>•</span>
                    <span>Roll: {data.student.roll_no}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Total Hall Dues</div>
                  <div className="font-mono text-sm font-semibold text-secondary-dark">
                    ৳{parseFloat(data.summary?.total_due_amount || 0).toFixed(2)} BDT
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              {(!data.dues?.residential || data.dues.residential.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                  <div className="font-medium text-slate-900 dark:text-white">All Hall Dues Settled</div>
                  <p className="text-slate-400">No pending dormitory or residential invoices found for this student.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                        <th className="pb-2">Invoice No</th>
                        <th className="pb-2">Billing Description</th>
                        <th className="pb-2">Hall / Room / Seat</th>
                        <th className="pb-2">Period</th>
                        <th className="pb-2">Net Due</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                      {data.dues.residential.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 font-mono text-slate-900 dark:text-white font-medium">
                            #{inv.invoice_no}
                          </td>
                          <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {inv.title || 'Hall Seat Rent'}
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-400">
                            {inv.hall_name || 'Dormitory'} {inv.room_number ? `— Rm ${inv.room_number}` : ''} {inv.seat_number ? `(${inv.seat_number})` : ''}
                          </td>
                          <td className="py-2.5 text-slate-500">
                            {inv.month_name || 'Current Term'}
                          </td>
                          <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                            ৳{parseFloat(inv.net_due || inv.amount).toFixed(2)} BDT
                          </td>
                          <td className="py-2.5">
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 uppercase">
                              {inv.payment_status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => openPay(inv)}
                              className="px-3 py-1 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors cursor-pointer"
                            >
                              Pay Seat Rent
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
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center space-y-1">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 uppercase">
                Not Found
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
                No Record Matching &quot;{studentId}&quot;
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Please verify the Student ID or Roll number and try again.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* 3. Checkout Modal */}
      <UniversalGatewayCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        invoice={activeInvoice}
        availableGateways={data?.available_gateways || []}
        domain={domain}
        apiEndpoint={domain ? `/api/${domain}/pay/residential-fees` : '/api/pay/residential-fees'}
        onPaymentSuccess={handleSearch}
      />
    </div>
  );
}

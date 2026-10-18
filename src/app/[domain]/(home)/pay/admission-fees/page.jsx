'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import UniversalGatewayCheckout from 'src/component/payment/UniversalGatewayCheckout';

export default function AdmissionFeesSearchPage() {
  const router = useRouter();
  const params = useParams();
  const domain = params?.domain || '';

  const [trackingNo, setTrackingNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal State
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!trackingNo.trim()) {
      toast.error('Please enter your Application Tracking Number or Phone.');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setData(null);

    try {
      const endpoint = domain
        ? `/api/${domain}/pay/admission-fees?identifier=${encodeURIComponent(trackingNo.trim())}`
        : `/api/pay/admission-fees?identifier=${encodeURIComponent(trackingNo.trim())}`;

      const res = await fetch(endpoint);
      const resJson = await res.json();

      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Admission applicant invoice not found.');
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
                Admission Clearance
              </span>
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">
              Admission Application Fees Clearance
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your Application Tracking Number (e.g. ADM-2026-XXXX) or registered phone to settle fees and advance to candidate photo upload.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Step Progression</span>
            <div className="font-mono text-xs font-medium text-primary-dark">
              Fee Settlement &rarr; Media Upload
            </div>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <input
            type="text"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder="Enter Application Tracking No (e.g. ADM-2026-0001) or Phone..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={searching}
            className="w-full sm:w-auto px-4 py-1.5 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {searching ? 'Finding...' : 'Track Application'}
          </button>
        </form>
      </div>

      {/* 2. Dues Results */}
      {hasSearched && (
        <div className="w-full space-y-4">
          {data?.applicant ? (
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3">
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Candidate Profile</div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                    {data.applicant.applicant_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>Tracking: <strong className="font-mono font-medium text-slate-800 dark:text-slate-200">{data.applicant.application_no}</strong></span>
                    <span>•</span>
                    <span>Circular: {data.applicant.circular_title}</span>
                    <span>•</span>
                    <span>Phone: {data.applicant.masked_phone || data.applicant.phone}</span>
                    <span>•</span>
                    <span className="capitalize">Status: {data.applicant.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Application Fee</div>
                    <div className="font-mono text-sm font-semibold text-secondary-dark">
                      ৳{parseFloat(data.summary?.total_due_amount || 0).toFixed(2)} BDT
                    </div>
                  </div>
                  <Link
                    href={`/pay/admission-fees/${data.applicant.id}`}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
                  >
                    Direct Checkout &rarr;
                  </Link>
                </div>
              </div>

              {/* Invoices Table */}
              {(!data.dues?.admission || data.dues.admission.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-500 space-y-2">
                  <div className="font-medium text-slate-900 dark:text-white">Application Fee Confirmed</div>
                  <p className="text-slate-400">Your application fee has already been verified. Proceed to candidate media upload.</p>
                  <Link
                    href={`/admission/upload/${data.applicant.id}`}
                    className="inline-block mt-2 px-3 py-1.5 rounded bg-primary hover:bg-primary-dark text-white font-medium text-xs transition-colors"
                  >
                    Upload Photo & Signature &rarr;
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                        <th className="pb-2">Invoice No</th>
                        <th className="pb-2">Circular Description</th>
                        <th className="pb-2">Application Tracking</th>
                        <th className="pb-2">Payable Amount</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                      {data.dues.admission.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 font-mono text-slate-900 dark:text-white font-medium">
                            #{inv.invoice_no}
                          </td>
                          <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {inv.title}
                          </td>
                          <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
                            {data.applicant.application_no}
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
                              Pay Fee
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
                No Application Matching &quot;{trackingNo}&quot;
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Please verify your Application Tracking Number or Phone and try again.
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
        apiEndpoint={domain ? `/api/${domain}/pay/admission-fees` : '/api/pay/admission-fees'}
        onPaymentSuccess={handleSearch}
      />
    </div>
  );
}

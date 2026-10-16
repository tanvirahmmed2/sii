'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FiUserCheck,
  FiSearch,
  FiCreditCard,
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiShield
} from 'react-icons/fi';
import UniversalGatewayCheckout from '@/component/payment/UniversalGatewayCheckout';

export default function AdmissionFeesSearchPage() {
  const router = useRouter();
  const params = useParams();
  const domain = params?.domain || '';

  const [trackingNo, setTrackingNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link
            href="/pay"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition mb-4"
          >
            <FiArrowLeft /> Back to Central Pay Portal
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                <FiUserCheck className="w-3.5 h-3.5" />
                <span>Admission Application Clearance</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
                Admission Application Fees
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter your Application Tracking Number (e.g. ADM-2026-XXXX) or registered phone to pay application dues.
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
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Enter Application Tracking No (e.g. ADM-2026-0001) or Phone..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {searching ? 'Finding...' : 'Track Application'}
            </button>
          </form>
        </div>

        {/* Results */}
        {hasSearched && (
          <div>
            {data?.applicant ? (
              <div className="space-y-6">
                {/* Applicant Bio Strip */}
                <div className="p-6 rounded-3xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Candidate Profile
                      </span>
                      <span className="text-xs font-mono font-bold bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                        {data.applicant.application_no}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white text-xl">
                      {data.applicant.applicant_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Circular: <strong>{data.applicant.circular_title}</strong></span>
                      <span>•</span>
                      <span>Phone: <strong>{data.applicant.masked_phone || data.applicant.phone}</strong></span>
                      <span>•</span>
                      <span>Status: <strong className="uppercase">{data.applicant.status}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-blue-200 dark:border-blue-800/60 pt-4 md:pt-0 md:pl-6">
                    <div>
                      <span className="text-xs text-slate-400">Application Fee</span>
                      <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                        ৳{data.summary?.total_due_amount?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <Link
                      href={`/pay/admission-fees/${data.applicant.id}`}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                    >
                      <span>Direct Checkout Page</span>
                      <FiArrowRight />
                    </Link>
                  </div>
                </div>

                {/* Admission Dues Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Application Fee Invoices
                    </h4>
                  </div>

                  {(!data.dues?.admission || data.dues.admission.length === 0) ? (
                    <div className="p-10 text-center space-y-3">
                      <FiCheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Application Fee Settled!</h4>
                      <p className="text-xs text-slate-500">Your application fee has already been confirmed.</p>
                      <Link
                        href={`/admission/upload/${data.applicant.id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        <span>Upload Candidate Media</span>
                        <FiArrowRight />
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.dues.admission.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-blue-600">
                                #{inv.invoice_no}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 uppercase">
                                {inv.payment_status}
                              </span>
                            </div>
                            <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                              {inv.title}
                            </h5>
                            <p className="text-xs text-slate-400">
                              Settling this invoice advances your application to Step 2 (Photo & Signature Upload).
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5">
                            <div className="text-right">
                              <div className="text-[11px] text-slate-400">Payable Fee</div>
                              <div className="text-lg font-black text-slate-900 dark:text-white">
                                ৳{parseFloat(inv.net_due || inv.amount).toFixed(2)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPay(inv)}
                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                            >
                              <FiCreditCard />
                              <span>Pay Application Fee</span>
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
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">No Application Found</h4>
                <p className="text-xs text-slate-500 mt-1">Please verify your Application Tracking Number or Phone.</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
          <FiShield className="text-blue-500" />
          <span>Official admission gateway with automated candidate ledger registration.</span>
        </div>
      </div>

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

'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  printSubscriptionReceipt,
  generateSubscriptionReceiptHTML,
  numberToWords,
  PLATFORM_INFO,
} from 'src/lib/receipts/subscription_receipt';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function CreatorPaymentInvoicePage({ params }) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params;
  const creatorId = resolvedParams?.id;
  const paymentId = resolvedParams?.paymentId;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (creatorId && paymentId) {
      fetch(`/api/marketing/creator/payments?id=${paymentId}&creatorId=${creatorId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.success && data.payment) {
            setPayment(data.payment);
          } else {
            setError(data.error || 'Invoice not found.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error(err);
          setError('Failed to load invoice details.');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setTimeout(() => setLoading(false), 0);
    }

    return () => {
      isMounted = false;
    };
  }, [creatorId, paymentId]);

  if (loading) {
    return (
      <LoadingScreen fullScreen={false} label="Loading official subscription receipt..." />
    );
  }

  if (error || !payment) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 text-center space-y-4 text-xs">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {error || 'Subscription payment record not found.'}
        </div>
        <Link
          href={`/creator/${creatorId}/payments`}
          className="inline-flex items-center gap-1.5 text-slate-800 font-semibold underline hover:text-blue-600"
        >
          &larr; Back to Billing & Invoices
        </Link>
      </div>
    );
  }

  const isCompleted = ['successful', 'completed', 'paid'].includes(payment.status?.toLowerCase());
  const isPending = ['pending', 'unpaid'].includes(payment.status?.toLowerCase());

  const creator = payment.creator || {
    name: payment.creator_name,
    email: payment.creator_email,
    phone: payment.creator_phone,
    institution: payment.creator_institution,
    address: payment.creator_address,
  };

  const packageInfo = payment.package || {
    name: payment.package_name || 'Standard Subscription Plan',
    max_websites: payment.max_websites || 1,
    max_teachers: payment.max_teachers || 'Unlimited',
    max_students: payment.max_students || 'Unlimited',
    max_storage_mb: payment.max_storage_mb,
    billing_interval: payment.billing_interval || 'monthly',
  };

  const purchase = payment.purchase || {
    id: payment.purchase_id,
    purchase_code: payment.purchase_code || 'N/A',
    period_start: payment.period_start,
    period_end: payment.period_end,
  };

  const currency = (payment.currency || (payment.payment_method === 'BKASH' ? 'BDT' : 'USD')).toUpperCase();
  const amountFormatted = currency === 'BDT'
    ? `৳${Number(payment.amount || 0).toLocaleString()} BDT`
    : `$${Number(payment.amount || 0).toFixed(2)} USD`;

  const amountInWords = numberToWords(payment.amount, currency);

  const paymentDate = payment.payment_date || payment.created_at
    ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  const periodStart = purchase.period_start
    ? new Date(purchase.period_start).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : paymentDate;

  const periodEnd = purchase.period_end
    ? new Date(purchase.period_end).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Auto-Renew';

  const handlePrint = () => {
    printSubscriptionReceipt(payment, creator, packageInfo, purchase);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-slate-800 text-xs pb-16">
      {/* Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <Link
          href={`/creator/${creatorId}/payments`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Invoices
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Official Receipt</span>
          </button>

          {isPending && (
            <Link
              href={`/creator/${creatorId}/payments/${paymentId}/pay`}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
            >
              Pay Now
            </Link>
          )}
        </div>
      </div>

      {/* Official Receipt Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden p-6 sm:p-10 space-y-8">
        {/* Receipt Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
          {/* Platform Info */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              <span className="text-xl font-bold tracking-tight text-slate-900">{PLATFORM_INFO.SITE_NAME}</span>
            </div>
            <p className="text-xs font-semibold text-slate-600">{PLATFORM_INFO.COMPANY_NAME}</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm">{PLATFORM_INFO.SITE_ADDRESS}</p>
            <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
              <div>Phone: <span className="text-slate-700 font-mono">{PLATFORM_INFO.SITE_CONTACT}</span></div>
              <div>Email: <span className="text-slate-700">{PLATFORM_INFO.SITE_MAIL}</span></div>
              <div>Website: <a href={PLATFORM_INFO.COMPANY_URL} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{PLATFORM_INFO.COMPANY_URL}</a></div>
            </div>
          </div>

          {/* Receipt Status & Meta */}
          <div className="sm:text-right space-y-2">
            <span
              className={`inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : isPending
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              {isCompleted ? '✓ PAID & VERIFIED' : payment.status?.toUpperCase() || 'UNPAID'}
            </span>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Official Subscription Receipt
            </h1>
            <div className="text-[11px] text-slate-500 font-mono space-y-1">
              <div>Receipt No: <strong className="text-slate-800">{payment.transaction_id || `PAY-${payment.id}`}</strong></div>
              <div>Order Ref: <span className="text-slate-800">{purchase.purchase_code || payment.purchase_code || 'N/A'}</span></div>
              <div>Date Issued: <span className="text-slate-800">{paymentDate}</span></div>
            </div>
          </div>
        </div>

        {/* Billed To / Creator Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-xl border border-slate-200/70">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
              Billed To (Subscriber)
            </span>
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">{creator.name || 'Account Holder'}</h3>
              {creator.institution && (
                <p className="text-slate-600 font-medium">{creator.institution}</p>
              )}
              <p className="text-slate-500">{creator.email || '—'}</p>
              <p className="text-slate-500 font-mono">{creator.phone || '—'}</p>
              {creator.address && (
                <p className="text-slate-500 text-[11px] pt-1">{creator.address}</p>
              )}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
              Subscription Term & Gateway
            </span>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Billing Interval:</span>
                <strong className="text-slate-800 capitalize font-medium">{packageInfo.billing_interval || 'Monthly'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Coverage Period:</span>
                <span className="text-slate-800 font-mono text-[11px]">{periodStart} – {periodEnd}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Gateway:</span>
                <strong className="text-slate-800 font-mono uppercase">{payment.payment_method || 'Paddle'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Transaction Ref:</span>
                <span className="text-slate-800 font-mono text-[11px]">{payment.transaction_id || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Package Info Table (all necessary details: website, teacher, student, storage; NO modules) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Subscription Package Breakdown
            </h2>
            <span className="text-[11px] text-slate-500">
              Package: <strong className="text-slate-800">{packageInfo.name || payment.package_name}</strong>
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Plan Item & Quota Entitlements</th>
                  <th className="py-3 px-4">Billing Cycle</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-4 px-4 space-y-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        {packageInfo.name || payment.package_name || 'Standard Plan'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Full educational platform tier with high-availability infrastructure
                      </span>
                    </div>

                    {/* All necessary details: website, teacher, students, storage; no internal modules */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Websites Allowed</span>
                        <strong className="text-xs text-slate-900 font-mono">{packageInfo.max_websites || 1} Site(s)</strong>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Teacher Limit</span>
                        <strong className="text-xs text-slate-900">{packageInfo.max_teachers ?? 'Unlimited'}</strong>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Student Limit</span>
                        <strong className="text-xs text-slate-900">{packageInfo.max_students ?? 'Unlimited'}</strong>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Cloud Storage</span>
                        <strong className="text-xs text-slate-900">
                          {packageInfo.max_storage_mb ? `${Math.round(packageInfo.max_storage_mb / 1024)} GB` : 'Standard'}
                        </strong>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <span className="font-semibold text-slate-900 uppercase text-xs block">
                      {packageInfo.billing_interval || 'Monthly'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block mt-1">
                      {periodStart} – {periodEnd}
                    </span>
                  </td>
                  <td className="py-4 px-4 align-top text-right font-mono font-bold text-slate-900 text-sm">
                    {amountFormatted}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Amount in Words */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
          {/* Amount In Words & Digital Verification */}
          <div className="w-full sm:w-7/12 space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70">
              <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider block mb-1">
                Amount In Words:
              </span>
              <p className="text-xs font-semibold text-blue-950 font-serif italic">
                &ldquo;{amountInWords}&rdquo;
              </p>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">Digital Receipt Notice:</p>
              <p>This is a certified electronic receipt issued by {PLATFORM_INFO.COMPANY_NAME}. All websites created under this subscription inherit the provisioned package capabilities.</p>
              <p className="font-mono text-[10px] text-slate-400">Checksum / Token: {payment.transaction_id || payment.id}</p>
            </div>
          </div>

          {/* Subtotal & Total */}
          <div className="w-full sm:w-5/12 bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between text-slate-600">
              <span>Subscription Subtotal:</span>
              <span className="font-mono text-slate-900">{amountFormatted}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Applied Discounts:</span>
              <span className="font-mono text-slate-900">{currency === 'BDT' ? '৳0.00' : '$0.00'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Processing / Tax:</span>
              <span className="font-mono text-slate-900">{currency === 'BDT' ? '৳0.00' : '$0.00'}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline font-bold text-slate-900">
              <span className="text-sm">Total Paid:</span>
              <span className="text-base font-mono text-blue-700">{amountFormatted}</span>
            </div>
          </div>
        </div>

        {/* Receipt Footer with Digital Seal */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            <div>Support inquiries: {PLATFORM_INFO.SITE_MAIL} | Helpline: {PLATFORM_INFO.SITE_CONTACT}</div>
            <div className="font-mono text-[10px] mt-0.5">&copy; {new Date().getFullYear()} {PLATFORM_INFO.COMPANY_NAME}. All rights reserved.</div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
              Authorized Digital Seal
            </span>
            <span className="text-xs font-bold text-slate-800 block">
              {PLATFORM_INFO.SITE_NAME} Billing
            </span>
            <span className="text-[9px] font-mono text-emerald-600 font-semibold block mt-0.5">
              SECURE ELECTRONIC RECORD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

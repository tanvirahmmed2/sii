'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiArrowBack,
  BiReceipt,
  BiCheckCircle,
  BiLoaderAlt,
  BiCreditCard,
  BiMobileAlt,
  BiDesktop,
  BiDownload,
} from 'react-icons/bi';
import { generateInvoiceData, printReceipt } from 'src/lib/invoice';


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
      fetch(`/api/creator/payments?id=${paymentId}&creatorId=${creatorId}`)
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2">
        <BiLoaderAlt className="animate-spin text-3xl text-secondary" />
        <p className="text-xs text-slate-500">Loading invoice...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error || 'Invoice record not found.'}
        </div>
        <Link
          href={`/creator/${creatorId}/payments`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline"
        >
          <BiArrowBack />
          <span>Back to Invoices</span>
        </Link>
      </div>
    );
  }

  const invoice = generateInvoiceData(payment);
  const isPaid = payment.status === 'COMPLETED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Top back link & Download Receipt button */}
      <div className="flex items-center justify-between">
        <Link
          href={`/creator/${creatorId}/payments`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-secondary transition-colors"
        >
          <BiArrowBack className="text-base" />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400">
            Ref: {invoice.invoiceNumber}
          </span>
          <button
            type="button"
            onClick={() => printReceipt(payment)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Download / Print PDF Receipt"
          >
            <BiDownload className="text-sm" />
            <span>Download Receipt</span>
          </button>
        </div>
      </div>


      {/* Main Invoice Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xs space-y-7">
        {/* 1. Company Data (Top) */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-sm">
                H
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {invoice.issuer.name}
              </h1>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
              <p>{invoice.issuer.email} &bull; {invoice.issuer.phone}</p>
              <p>{invoice.issuer.address}</p>
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              }`}
            >
              {isPaid ? 'PAID' : 'UNPAID'}
            </span>
            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Official Invoice
            </div>
          </div>
        </div>

        {/* 2. Invoice Data & 3. Creator Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs pb-6 border-b border-slate-100 dark:border-slate-800">
          {/* 2. Invoice Data */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Invoice Information
            </span>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-24">Invoice No:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-24">Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.date}</span>
              </div>
            </div>
          </div>

          {/* 3. Creator Data */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Creator Information
            </span>
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {invoice.customer.name}
              </div>
              <div>{invoice.customer.email}</div>
              {invoice.customer.id && (
                <div className="text-slate-400 text-[11px]">Creator ID: #{invoice.customer.id}</div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Package Data */}
        <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Package & Plan Details
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="pb-2.5">Package</th>
                  <th className="pb-2.5">Description</th>
                  <th className="pb-2.5 text-center">Interval</th>
                  <th className="pb-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr>
                  <td className="py-3.5 font-bold text-slate-900 dark:text-white text-sm">
                    {invoice.item.packageName}
                  </td>
                  <td className="py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                    {invoice.item.description}
                  </td>
                  <td className="py-3.5 text-center font-medium capitalize text-slate-600 dark:text-slate-300">
                    {invoice.item.billingInterval.toLowerCase()}
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap text-sm">
                    {invoice.pricing.currencySymbol}{invoice.pricing.total} {invoice.pricing.currency}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Payment Data, Payment Method, Value, Status */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 text-xs pb-2">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Payment Information
            </span>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                  {invoice.paymentMethod}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Payment Status:</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Value Summary (Single currency) */}
          <div className="w-full sm:w-60 space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {invoice.pricing.currencySymbol}{invoice.pricing.subtotal} {invoice.pricing.currency}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Processing:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {invoice.pricing.currencySymbol}0.00 {invoice.pricing.currency}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 dark:text-white text-sm">Total Due:</span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {invoice.pricing.currencySymbol}{invoice.pricing.total} <span className="text-xs font-normal text-slate-400">{invoice.pricing.currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action: Paid state vs Unpaid payment options */}
        {isPaid ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
              <BiCheckCircle className="text-base" />
              <span>This invoice is paid in full. Your subscription is active.</span>
            </div>
            <Link
              href={`/creator/${creatorId}/webites`}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-all shadow-xs"
            >
              <BiDesktop />
              <span>Go to Website Builder &rarr;</span>
            </Link>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Choose Payment Method to Settle Invoice:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: bKash */}
              <Link
                href={`/creator/${creatorId}/payments/${paymentId}/pay?gateway=bkash`}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-900 dark:hover:border-slate-100 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E2136E]/10 text-[#E2136E] flex items-center justify-center">
                    <BiMobileAlt className="text-lg" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">bKash (বিকাশ)</div>
                    <div className="text-[10px] text-slate-400">Instant Mobile Checkout</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:translate-x-0.5 transition-transform">
                  Pay &rarr;
                </span>
              </Link>

              {/* Option 2: Payoneer */}
              <Link
                href={`/creator/${creatorId}/payments/${paymentId}/pay?gateway=payoneer`}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-900 dark:hover:border-slate-100 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <BiCreditCard className="text-lg" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">Payoneer / Card</div>
                    <div className="text-[10px] text-slate-400">Debit / Credit Cards</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:translate-x-0.5 transition-transform">
                  Pay &rarr;
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


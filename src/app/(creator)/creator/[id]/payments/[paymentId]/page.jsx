'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';

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
      <div className="py-8 text-center text-xs text-slate-500 font-medium">
        Loading invoice details...
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="w-full py-8 text-center space-y-3 text-xs">
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
          {error || 'Invoice record not found.'}
        </div>
        <Link
          href={`/creator/${creatorId}/payments`}
          className="text-slate-800 font-semibold underline"
        >
          &larr; Back to Invoices
        </Link>
      </div>
    );
  }

  const isCompleted = ['successful', 'completed'].includes(payment.status?.toLowerCase());
  const isPending = ['pending', 'unpaid'].includes(payment.status?.toLowerCase());

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Back link & actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/creator/${creatorId}/payments`}
          className="text-slate-600 hover:text-slate-900 font-medium"
        >
          &larr; Back to Invoices
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
          >
            Print Receipt
          </button>
          {isPending && (
            <Link
              href={`/creator/${creatorId}/payments/${paymentId}/pay`}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium"
            >
              Pay Now
            </Link>
          )}
        </div>
      </div>

      {/* Invoice Card */}
      <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Official Invoice
            </span>
            <h1 className="text-sm font-semibold text-slate-900">
              INV-{payment.id}
            </h1>
            <span className="text-[10px] text-slate-500 font-mono">
              Txn: {payment.transaction_id || 'N/A'}
            </span>
          </div>

          <div className="text-right">
            <span
              className={`text-[9px] font-medium px-2 py-0.5 rounded border ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isPending
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {payment.status}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono mt-1">
              {payment.payment_date || payment.created_at
                ? new Date(payment.payment_date || payment.created_at).toLocaleDateString()
                : '—'}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 py-1">
          <div className="flex justify-between text-slate-600">
            <span>Package Subscription:</span>
            <span className="text-slate-900 font-medium">{payment.package_name || 'Creator Plan'}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Billing Interval:</span>
            <span className="text-slate-900 capitalize">{payment.billing_interval || 'monthly'}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Payment Gateway:</span>
            <span className="text-slate-900">{payment.payment_method || 'Paddle'}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Websites Permitted:</span>
            <span className="text-slate-900 font-mono">{payment.max_websites || 1}</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-semibold text-slate-900">
          <span>Total Amount</span>
          <span className="font-mono">
            {payment.currency === 'BDT'
              ? `৳${payment.amount} BDT`
              : `$${Number(payment.amount || 0).toFixed(2)} USD`}
          </span>
        </div>
      </div>
    </div>
  );
}

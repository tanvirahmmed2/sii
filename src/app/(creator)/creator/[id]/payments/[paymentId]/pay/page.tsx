'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { BiArrowBack, BiLoaderAlt, BiShieldQuarter, BiLockAlt, BiCreditCard, BiInfoCircle } from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function CreatorPaymentPayPage({ params }: any) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params;
  const creatorId = resolvedParams?.id;
  const paymentId = resolvedParams?.paymentId;

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initiating, setInitiating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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
        .catch(() => {
          if (!isMounted) return;
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

  const handlePaySslcommerz = async () => {
    if (!payment) return;
    setInitiating(true);
    setError('');

    try {
      const res = await fetch('/api/payment/sslcommerz/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          creatorId: payment.creator_id,
        }),
      });

      const data = await res.json();
      if (data.success && data.gatewayUrl) {
        window.location.href = data.gatewayUrl;
        return;
      } else {
        setError(data.error || 'Failed to initiate SSLCommerz gateway session.');
      }
    } catch {
      setError('Network error initiating SSLCommerz gateway.');
    } finally {
      setInitiating(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={true} label="Loading payment checkout..." />;
  }

  if (error || !payment) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error || 'Invoice not found.'}
          </div>
          <Link
            href={`/creator/${creatorId}/payments`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 underline"
          >
            &larr; Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const isAlreadyPaid = ['successful', 'completed', 'paid'].includes(payment.status?.toLowerCase());
  const currency = (payment.currency || 'BDT').toUpperCase();
  const currencySymbols: Record<string, string> = {
    BDT: '৳',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
  };
  const symbol = currencySymbols[currency] || '$';

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/creator/${creatorId}/payments/${paymentId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <BiArrowBack className="text-base" />
            <span>Back to Invoice</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 shadow-xs">
            <BiShieldQuarter className="text-sm text-secondary" />
            <span>SSLCommerz Secured</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-2xl mb-2">
              <BiCreditCard />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Settle Invoice #{payment.invoice_no || payment.id}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pay securely via Cards, bKash, Nagad, Rocket, or Internet Banking.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <BiInfoCircle className="text-base shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Package</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {payment.package_name || 'SaaS Subscription'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Billing Cycle</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {payment.billing_interval || payment.billing_cycle || 'Monthly'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Invoice Status</span>
              <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded-md ${
                isAlreadyPaid
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}>
                {payment.status || 'UNPAID'}
              </span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700/80 pt-2.5 flex justify-between items-baseline font-bold text-slate-900 dark:text-white">
              <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Due
              </span>
              <span className="text-2xl font-mono text-secondary">
                {symbol}{Number(payment.amount || 0).toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {isAlreadyPaid ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-center space-y-3">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                This invoice has already been successfully paid and settled.
              </p>
              <Link
                href={`/creator/${creatorId}/payments/${paymentId}`}
                className="inline-block py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition"
              >
                View Official Receipt
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePaySslcommerz}
              disabled={initiating}
              className="w-full py-4 px-6 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs uppercase tracking-wider transition shadow-xl shadow-secondary/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {initiating ? (
                <>
                  <BiLoaderAlt className="animate-spin text-base" />
                  <span>Connecting to SSLCommerz...</span>
                </>
              ) : (
                <>
                  <BiLockAlt className="text-base" />
                  <span>Pay with SSLCommerz &rarr;</span>
                </>
              )}
            </button>
          )}

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400">
              Authorized developers can also record manual settlements using Payment ID #{payment.id}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

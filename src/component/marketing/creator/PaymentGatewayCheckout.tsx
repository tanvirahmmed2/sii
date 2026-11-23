'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiCheckCircle,
  BiShieldQuarter,
  BiCreditCard,
  BiLoaderAlt,
  BiInfoCircle,
  BiArrowBack,
  BiUserCheck,
  BiTransfer,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function PaymentGatewayCheckout({
  creatorId,
  paymentId,
  onSuccess,
}: any) {
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(creatorId && paymentId));
  const [paying, setPaying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [confirmedTxnId, setConfirmedTxnId] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!creatorId || !paymentId) {
      return;
    }

    fetch(`/api/marketing/creator/payments?id=${paymentId}&creatorId=${creatorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.payment) {
          setPayment(data.payment);
          if (data.payment.status === 'successful' || data.payment.status === 'COMPLETED') {
            setPaymentSuccess(true);
            setConfirmedTxnId(data.payment.transaction_id || '');
            if (onSuccess) onSuccess(data.payment);
          }
        } else {
          setError(data.error || 'Invoice record not found.');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Network error fetching payment invoice.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [creatorId, paymentId, onSuccess]);

  const handlePayOnlineSslcommerz = async () => {
    if (!payment) return;
    setPaying(true);
    setError('');

    try {
      const res = await fetch('/api/payment/sslcommerz/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: Number(creatorId),
          paymentId: Number(payment.id),
          purchaseId: Number(payment.purchase_id),
        }),
      });

      const data = await res.json();
      if (data.success && data.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      } else {
        setError(data.error || 'Failed to initiate SSLCommerz payment gateway. Please try again.');
        setPaying(false);
      }
    } catch {
      setError('Network error connecting to SSLCommerz.');
      setPaying(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={false} label="Loading SSLCommerz checkout..." />;
  }

  if (paymentSuccess) {
    return (
      <div className="w-full max-w-xl mx-auto my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-3xl">
          <BiCheckCircle />
        </div>
        <div className="space-y-1.5">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Payment Settled
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Invoice Completed</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This invoice has been completed and verified. Your subscription is active.
          </p>
        </div>

        {confirmedTxnId && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-left font-mono space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Transaction Ref</span>
            <span className="text-slate-900 dark:text-white font-bold">{confirmedTxnId}</span>
          </div>
        )}

        <div className="pt-2">
          <Link
            href={`/creator/${creatorId}`}
            className="inline-flex items-center justify-center py-3 px-6 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs tracking-wide transition shadow-lg shadow-secondary/20"
          >
            Go to Creator Workspace &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const isYearly = String(payment?.billing_interval || '').toLowerCase() === 'yearly';
  const displayAmount = Number(payment?.amount || 0);
  const displayCurrency = payment?.currency || 'BDT';
  const currencySymbol = displayCurrency === 'BDT' ? '৳' : '$';

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/creator/${creatorId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <BiArrowBack className="text-base" />
          <span>Back to Workspace</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 shadow-xs">
          <BiShieldQuarter className="text-sm text-secondary" />
          <span>SSLCommerz Protected</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                SSLCommerz Checkout
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Pending Payment
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Complete your subscription invoice or request developer manual payment verification.
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {currencySymbol}{displayAmount.toLocaleString()}
            </span>
            <span className="block text-[11px] text-slate-400 uppercase font-bold">{displayCurrency}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <BiInfoCircle className="text-base shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Package</span>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {payment?.package_name || 'Standard Package'}
            </div>
            <div className="text-slate-500 capitalize">Billing: {isYearly ? 'Annual' : 'Monthly'}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Invoice / Account</span>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              #{payment?.id} (Purchase #{payment?.purchase_id})
            </div>
            <div className="text-slate-500 truncate">{payment?.creator_email || creatorId}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-linear-to-br from-indigo-50/70 via-purple-50/40 to-slate-50/50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md shadow-indigo-600/30">
                <BiCreditCard />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Pay with SSLCommerz
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instant automated settlement with bKash, Nagad, Rocket, Visa, Mastercard, or Internet Banking.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">bKash</span>
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">Nagad</span>
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">Rocket</span>
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">Visa</span>
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">Mastercard</span>
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">Cards / Banking</span>
          </div>

          <button
            type="button"
            onClick={handlePayOnlineSslcommerz}
            disabled={paying}
            className="w-full py-4 px-6 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs uppercase tracking-wider transition shadow-xl shadow-secondary/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying ? (
              <>
                <BiLoaderAlt className="animate-spin text-base" />
                <span>Redirecting to SSLCommerz...</span>
              </>
            ) : (
              <span>Proceed to SSLCommerz Gateway &rarr;</span>
            )}
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <BiUserCheck className="text-base text-secondary" />
            <span>Manual Developer Settlement</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            If you have made a direct bank deposit or cash handover, provide your Payment ID to an authorized platform developer to manually verify and mark your payment completed.
          </p>
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500">Payment Invoice ID:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">#{payment?.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

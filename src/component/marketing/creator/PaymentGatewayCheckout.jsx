'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function PaymentGatewayCheckout({
  creatorId,
  paymentId,
  initialGateway,
  onSuccess,
  onClose,
  isModal = false,
}) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const [gateway, setGateway] = useState(() => {
    const init = String(initialGateway || '').toLowerCase();
    if (init === 'paypal') return 'paypal';
    if (init === 'paddle' || init === 'stripe_connect' || init === 'stripe') return 'paddle';
    return 'surjopay';
  });

  useEffect(() => {
    let isMounted = true;
    if (creatorId && paymentId) {
      fetch(`/api/marketing/creator/payments?id=${paymentId}&creatorId=${creatorId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.success && data.payment) {
            setPayment(data.payment);
            if (data.payment.status === 'successful' || data.payment.status === 'COMPLETED') {
              if (onSuccess) onSuccess(data.payment);
            }
          } else {
            setError(data.error || 'Invoice record not found.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error(err);
          setError('Network error fetching payment invoice.');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [creatorId, paymentId, onSuccess]);

  const isYearly = String(payment?.billing_interval || '').toUpperCase() === 'YEARLY';
  const bdtPrice = isYearly
    ? Number(payment?.yearly_price_bdt ?? payment?.package_bdt_price ?? payment?.amount ?? 0)
    : Number(payment?.monthly_price_bdt ?? payment?.package_bdt_price ?? payment?.amount ?? 0);
  const usdPrice = isYearly
    ? Number(payment?.yearly_price_usd ?? payment?.package_usd_price ?? payment?.amount ?? 0)
    : Number(payment?.monthly_price_usd ?? payment?.package_usd_price ?? payment?.amount ?? 0);

  const handlePay = async () => {
    if (!payment) return;
    setPaying(true);
    setError('');

    try {
      const res = await fetch('/api/marketing/creator/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_invoice',
          paymentId: payment.id,
          creatorId: payment.creator_id || creatorId,
          gatewayCode: gateway,
        }),
      });

      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || 'Failed to initiate secure payment session.');
        setPaying(false);
      }
    } catch (err) {
      setError(err.message || 'Network communication error.');
      setPaying(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={!isModal} label="Loading payment details..." />;
  }

  const isBdt = gateway === 'surjopay';
  const payableAmountDisplay = isBdt ? `৳${bdtPrice.toFixed(2)} BDT` : `$${usdPrice.toFixed(2)} USD`;

  return (
    <div className={`w-full max-w-xl mx-auto ${isModal ? 'p-2' : 'p-4 sm:p-6 my-6'}`}>
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Invoice #{payment?.id || paymentId}
            </span>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">
              {payment?.package_name || 'Package Subscription'}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900 font-mono">{payableAmountDisplay}</div>
            <div className="text-[11px] text-slate-500 capitalize">{isYearly ? 'Annual Billing' : 'Monthly Billing'}</div>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="p-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Select Payment Gateway
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            <label
              onClick={() => setGateway('surjopay')}
              className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                gateway === 'surjopay'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="gateway_choice"
                  checked={gateway === 'surjopay'}
                  onChange={() => setGateway('surjopay')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    shurjoPay
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-medium">
                      Recommended BDT
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    bKash, Nagad, Rocket, Upay, Visa & Mastercard
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-xs font-semibold text-slate-900">
                ৳{bdtPrice} BDT
              </div>
            </label>

            <label
              onClick={() => setGateway('paypal')}
              className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                gateway === 'paypal'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="gateway_choice"
                  checked={gateway === 'paypal'}
                  onChange={() => setGateway('paypal')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    PayPal
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-medium">
                      Recommended USD
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    PayPal balance, debit, credit cards & international currencies
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-xs font-semibold text-slate-900">
                ${usdPrice.toFixed(2)} USD
              </div>
            </label>

            <label
              onClick={() => setGateway('paddle')}
              className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                gateway === 'paddle'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="gateway_choice"
                  checked={gateway === 'paddle'}
                  onChange={() => setGateway('paddle')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Paddle Billing
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Global Cards, Apple Pay, Google Pay & Tax Compliance
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-xs font-semibold text-slate-900">
                ${usdPrice.toFixed(2)} USD
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
            >
              {paying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Gateway...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Pay {payableAmountDisplay}</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Encrypted 256-bit TLS Gateway Session</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

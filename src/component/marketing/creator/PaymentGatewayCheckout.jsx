'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

export default function PaymentGatewayCheckout({
  creatorId,
  paymentId,
  initialGateway,
  onSuccess,
}) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(creatorId && paymentId));
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [confirmedTxnId, setConfirmedTxnId] = useState('');

  const [gateway, setGateway] = useState(() => {
    const init = String(initialGateway || '').toLowerCase();
    if (init === 'paypal') return 'paypal';
    if (init === 'paddle' || init === 'stripe_connect' || init === 'stripe') return 'paddle';
    return 'surjopay';
  });

  const [bdtSubMethod, setBdtSubMethod] = useState(() => {
    const init = String(initialGateway || '').toLowerCase();
    if (init === 'nagad') return 'nagad';
    if (init === 'rocket') return 'rocket';
    if (init === 'card') return 'card';
    return 'bkash';
  });

  const [formData, setFormData] = useState({
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    trxId: '',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    paypalEmail: '',
    paypalRef: '',
    paddleEmail: '',
    paddleCountry: '',
    paddleRef: '',
  });

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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isYearly = String(payment?.billing_interval || '').toUpperCase() === 'YEARLY';
  const bdtPrice = isYearly
    ? Number(payment?.yearly_price_bdt ?? payment?.amount ?? 0)
    : Number(payment?.monthly_price_bdt ?? payment?.amount ?? 0);
  const usdPrice = isYearly
    ? Number(payment?.yearly_price_usd ?? payment?.amount ?? 0)
    : Number(payment?.monthly_price_usd ?? payment?.amount ?? 0);

  const isBdt = gateway === 'surjopay';
  const activeAmount = isBdt ? bdtPrice : usdPrice;
  const activeCurrency = isBdt ? 'BDT' : 'USD';
  const formattedDisplay = isBdt ? `৳${bdtPrice.toFixed(2)} BDT` : `$${usdPrice.toFixed(2)} USD`;

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payment) return;
    setPaying(true);
    setError('');

    try {
      let resolvedMethod = gateway;
      let accountNumber = '';
      let txReference = '';

      if (gateway === 'surjopay') {
        resolvedMethod = bdtSubMethod;
        if (bdtSubMethod === 'bkash') {
          accountNumber = formData.bkashNumber;
          txReference = formData.trxId;
        } else if (bdtSubMethod === 'nagad') {
          accountNumber = formData.nagadNumber;
          txReference = formData.trxId;
        } else if (bdtSubMethod === 'rocket') {
          accountNumber = formData.rocketNumber;
          txReference = formData.trxId;
        } else if (bdtSubMethod === 'card') {
          accountNumber = formData.cardNumber ? formData.cardNumber.slice(-4) : 'Card';
          txReference = formData.cardName;
        }
      } else if (gateway === 'paypal') {
        accountNumber = formData.paypalEmail;
        txReference = formData.paypalRef;
      } else if (gateway === 'paddle') {
        accountNumber = formData.paddleEmail;
        txReference = formData.paddleRef;
      }

      const res = await fetch('/api/marketing/creator/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_payment',
          paymentId: payment.id,
          creatorId: payment.creator_id || creatorId,
          gatewayCode: resolvedMethod,
          accountNumber: accountNumber || 'Online Payment',
          gatewayOrderId: txReference || '',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(true);
        setConfirmedTxnId(data.transactionId || '');
        if (onSuccess) {
          onSuccess({
            ...payment,
            status: 'successful',
            transaction_id: data.transactionId,
          });
        }
      } else {
        setError(data.error || 'Failed to verify and confirm payment.');
      }
    } catch {
      setError('Network communication error while confirming payment.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen={false} label="Loading payment gateway details..." />;
  }

  if (paymentSuccess) {
    return (
      <div className="w-full max-w-xl mx-auto p-4 sm:p-6 my-6 text-xs text-slate-800">
        <div className="bg-white border border-emerald-300 rounded-lg shadow-sm p-6 space-y-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl font-bold">
            ✓
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Payment Completed Successfully!</h2>
            <p className="text-slate-600">
              Your subscription for {payment?.package_name || 'selected plan'} is now active and ready.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Invoice ID:</span>
              <span className="font-semibold text-slate-900 font-mono">#{payment?.id || paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Transaction Reference:</span>
              <span className="font-semibold text-emerald-700 font-mono">{confirmedTxnId || 'VERIFIED'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Amount Paid:</span>
              <span className="font-semibold text-slate-900 font-mono">{formattedDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Billing Interval:</span>
              <span className="capitalize text-slate-900 font-sans">{isYearly ? 'Annual (365 Days)' : 'Monthly (30 Days)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Subscription Status:</span>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-sans font-semibold">Active</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Link
              href={`/creator/${creatorId}/payments/${payment?.id || paymentId}`}
              className="flex-1 py-2.5 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-center transition"
            >
              View Official Receipt
            </Link>
            <Link
              href={`/creator/${creatorId}/workspace`}
              className="flex-1 py-2.5 px-3 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-center transition"
            >
              Go to Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 my-6 text-xs text-slate-800">
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
            <div className="text-lg font-bold text-slate-900 font-mono">{formattedDisplay}</div>
            <div className="text-[11px] text-slate-500 capitalize">{isYearly ? 'Annual Billing' : 'Monthly Billing'}</div>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Payment Platform
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGateway('surjopay')}
                className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                  gateway === 'surjopay'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-emerald-700">shurjoPay</div>
                <div className="text-[10px] text-slate-500">bKash, Nagad, Cards</div>
                <div className="text-[11px] font-mono text-slate-800 mt-1">৳{bdtPrice.toFixed(2)} BDT</div>
              </button>

              <button
                type="button"
                onClick={() => setGateway('paypal')}
                className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                  gateway === 'paypal'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-blue-700">PayPal</div>
                <div className="text-[10px] text-slate-500">Global USD Wallet</div>
                <div className="text-[11px] font-mono text-slate-800 mt-1">${usdPrice.toFixed(2)} USD</div>
              </button>

              <button
                type="button"
                onClick={() => setGateway('paddle')}
                className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                  gateway === 'paddle'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-indigo-700">Paddle Billing</div>
                <div className="text-[10px] text-slate-500">Global Cards & Pay</div>
                <div className="text-[11px] font-mono text-slate-800 mt-1">${usdPrice.toFixed(2)} USD</div>
              </button>
            </div>
          </div>

          {gateway === 'surjopay' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Choose Local Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setBdtSubMethod('bkash')}
                  className={`py-2 px-2.5 rounded border text-center cursor-pointer transition ${
                    bdtSubMethod === 'bkash'
                      ? 'border-pink-600 bg-pink-50 text-pink-700 font-bold ring-1 ring-pink-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  bKash
                </button>
                <button
                  type="button"
                  onClick={() => setBdtSubMethod('nagad')}
                  className={`py-2 px-2.5 rounded border text-center cursor-pointer transition ${
                    bdtSubMethod === 'nagad'
                      ? 'border-orange-600 bg-orange-50 text-orange-700 font-bold ring-1 ring-orange-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Nagad
                </button>
                <button
                  type="button"
                  onClick={() => setBdtSubMethod('rocket')}
                  className={`py-2 px-2.5 rounded border text-center cursor-pointer transition ${
                    bdtSubMethod === 'rocket'
                      ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold ring-1 ring-purple-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Rocket
                </button>
                <button
                  type="button"
                  onClick={() => setBdtSubMethod('card')}
                  className={`py-2 px-2.5 rounded border text-center cursor-pointer transition ${
                    bdtSubMethod === 'card'
                      ? 'border-slate-800 bg-slate-100 text-slate-900 font-bold ring-1 ring-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleConfirmPayment} className="space-y-4 pt-2">
            {gateway === 'surjopay' && bdtSubMethod === 'bkash' && (
              <div className="p-3.5 rounded-lg border border-pink-200 bg-pink-50/30 space-y-3">
                <div className="text-[11px] text-pink-900 font-medium">
                  Send ৳{bdtPrice.toFixed(2)} BDT to Merchant Wallet Number 01700-000000 or pay via the bKash App, then submit your mobile number and Transaction ID below.
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Your bKash Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.bkashNumber}
                    onChange={(e) => handleInputChange('bkashNumber', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    bKash Transaction ID (TrxID)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.trxId}
                    onChange={(e) => handleInputChange('trxId', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-pink-500 uppercase"
                  />
                </div>
              </div>
            )}

            {gateway === 'surjopay' && bdtSubMethod === 'nagad' && (
              <div className="p-3.5 rounded-lg border border-orange-200 bg-orange-50/30 space-y-3">
                <div className="text-[11px] text-orange-900 font-medium">
                  Transfer ৳{bdtPrice.toFixed(2)} BDT to Nagad Merchant Wallet 01700-000000, then provide your Nagad number and Transaction ID below.
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Your Nagad Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.nagadNumber}
                    onChange={(e) => handleInputChange('nagadNumber', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Nagad Transaction ID (TrxID)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.trxId}
                    onChange={(e) => handleInputChange('trxId', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase"
                  />
                </div>
              </div>
            )}

            {gateway === 'surjopay' && bdtSubMethod === 'rocket' && (
              <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/30 space-y-3">
                <div className="text-[11px] text-purple-900 font-medium">
                  Send ৳{bdtPrice.toFixed(2)} BDT via Rocket to Biller / Merchant ID 01700-000000-8, then enter your 12-digit Rocket mobile number and TrxID.
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Your Rocket Mobile Number (12 digits)
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.rocketNumber}
                    onChange={(e) => handleInputChange('rocketNumber', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Rocket Transaction ID (TrxID)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.trxId}
                    onChange={(e) => handleInputChange('trxId', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 uppercase"
                  />
                </div>
              </div>
            )}

            {((gateway === 'surjopay' && bdtSubMethod === 'card') || gateway === 'paddle') && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="text-[11px] text-slate-600 font-medium">
                  Enter your card credentials to complete the {formattedDisplay} payment securely.
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cardName}
                    onChange={(e) => handleInputChange('cardName', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Expiration (MM/YY)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={formData.cardExpiry}
                      onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Security Code (CVC)
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={formData.cardCvc}
                      onChange={(e) => handleInputChange('cardCvc', e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {gateway === 'paypal' && (
              <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-3">
                <div className="text-[11px] text-blue-900 font-medium">
                  Connect your verified PayPal account to approve this ${usdPrice.toFixed(2)} USD subscription payment.
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    PayPal Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.paypalEmail}
                    onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    PayPal Transaction / Order Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.paypalRef}
                    onChange={(e) => handleInputChange('paypalRef', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={paying}
              className="w-full py-2.5 px-4 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Payment...</span>
                </>
              ) : (
                <span>Confirm & Pay {formattedDisplay}</span>
              )}
            </button>
          </form>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Encrypted 256-bit TLS Gateway Session</span>
          <Link
            href={`/creator/${creatorId}/payments`}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Cancel & Return
          </Link>
        </div>
      </div>
    </div>
  );
}

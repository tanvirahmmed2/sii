'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCreator } from '../layout';
import PaymentGatewayCheckout from 'src/component/marketing/creator/PaymentGatewayCheckout';

export default function CreatorPurchasesPage() {
  const {
    creatorId,
    activeSubscription,
    stats = {},
    refetch,
  } = useCreator();

  const [purchasesList, setPurchasesList] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  // Renewal Modal State
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalCycle, setRenewalCycle] = useState('monthly');
  const [renewalGateway, setRenewalGateway] = useState('BKASH');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState(null);
  const [renewalError, setRenewalError] = useState('');
  const [renewalSuccess, setRenewalSuccess] = useState('');

  const daysRemaining = stats?.daysRemaining || 0;
  const isPlanActive = Boolean(activeSubscription && (stats?.hasActivePackage || daysRemaining > 0));

  const loadPurchases = async () => {
    try {
      const res = await fetch(`/api/marketing/creator/purchases?creatorId=${creatorId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.purchases)) {
        setPurchasesList(json.purchases);
      }
    } catch (_) {
    } finally {
      setLoadingPurchases(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [creatorId]);

  // Package prices for renewal
  const isYearly = renewalCycle === 'yearly';
  const pkgBdtPrice = isYearly
    ? Number(activeSubscription?.yearly_price_bdt || 35000)
    : Number(activeSubscription?.monthly_price_bdt || 3500);
  const pkgUsdPrice = isYearly
    ? Number(activeSubscription?.yearly_price_usd || 290)
    : Number(activeSubscription?.monthly_price_usd || 29);

  const handleStartRenewalPayment = async () => {
    setCreatingOrder(true);
    setRenewalError('');
    try {
      const packageId = activeSubscription?.package_id || activeSubscription?.id;
      if (!packageId) {
        setRenewalError('No purchased package found to renew.');
        return;
      }

      const res = await fetch('/api/marketing/creator/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_order',
          creatorId: Number(creatorId),
          packageId: Number(packageId),
          paymentMethod: renewalGateway,
          billingCycle: renewalCycle,
          notes: `Subscription renewal for ${activeSubscription?.package_name || 'package'}`,
        }),
      });

      const json = await res.json();
      if (json.success && json.payment?.id) {
        setActivePaymentId(json.payment.id);
      } else {
        setRenewalError(json.error || 'Failed to initiate renewal invoice.');
      }
    } catch (err) {
      setRenewalError('Network error initiating renewal order.');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handlePaymentCompleted = async () => {
    setRenewalSuccess('Subscription renewed successfully! New duration is active.');
    setActivePaymentId(null);
    if (refetch) await refetch();
    await loadPurchases();
    setTimeout(() => {
      setRenewalModalOpen(false);
      setRenewalSuccess('');
    }, 1500);
  };

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Purchased Package & Billing History
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            View your current active plan duration, renewal terms, and all historical purchase records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubscription && (
            <button
              type="button"
              onClick={() => {
                setRenewalModalOpen(true);
                setActivePaymentId(null);
                setRenewalError('');
                setRenewalSuccess('');
              }}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors cursor-pointer"
            >
              Renew Subscription
            </button>
          )}
          <Link
            href="/packages"
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            Explore All Packages
          </Link>
        </div>
      </div>

      {renewalSuccess && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
          {renewalSuccess}
        </div>
      )}

      {/* 1. CURRENT PURCHASED PACKAGE CARD */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              Active Purchased Plan
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.2 rounded border ${
                isPlanActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isPlanActive ? 'Active Duration' : 'Expired / Inactive'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Billing Cycle:{' '}
            <span className="font-semibold text-slate-800 capitalize">
              {activeSubscription?.billing_interval || 'monthly'}
            </span>
          </div>
        </div>

        {activeSubscription ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Package</span>
              <h2 className="text-lg font-semibold text-slate-900">
                {activeSubscription.package_name || 'Standard Tier'}
              </h2>
              <p className="text-slate-500 text-[11px] line-clamp-2">
                {activeSubscription.package_description || 'Website hosting & creator studio tools.'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Websites Limit</span>
              <div className="text-sm font-semibold font-mono text-slate-900">
                {activeSubscription.max_websites ?? activeSubscription.max_portfolios ?? 1}{' '}
                {(activeSubscription.max_websites ?? activeSubscription.max_portfolios ?? 1) === 1 ? 'Website' : 'Websites'}
              </div>
              <span className="text-[10px] text-slate-500">Full subdomain & edge support</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Schedule & Expiry</span>
              <div className="text-sm font-semibold font-mono text-slate-900">
                {daysRemaining} Days Left
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Ends: {activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString() : 'N/A'}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenewalModalOpen(true);
                  setActivePaymentId(null);
                  setRenewalError('');
                  setRenewalSuccess('');
                }}
                className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-center transition-colors cursor-pointer"
              >
                Renew Plan Duration
              </button>
              <Link
                href="/packages"
                className="w-full py-1.5 px-3 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-center transition-colors"
              >
                Change / Upgrade
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <p className="text-slate-600 font-medium">No active package subscription found.</p>
            <p className="text-slate-400 text-[11px]">
              Select a package to activate website publishing and creator studio capabilities.
            </p>
            <div className="pt-2">
              <Link
                href="/packages"
                className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium inline-block"
              >
                Browse Available Packages &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 2. PURCHASES & BILLING HISTORY TABLE */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Purchases & Invoices History ({purchasesList.length})
          </h3>
          <span className="text-[10px] text-slate-400">All creator transactions</span>
        </div>

        {loadingPurchases ? (
          <div className="py-8 text-center text-slate-500 font-medium">
            Loading purchases history...
          </div>
        ) : purchasesList.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            No past purchase transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Order Code</th>
                  <th className="pb-2">Package</th>
                  <th className="pb-2">Cycle</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Gateway</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Transaction Ref</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {purchasesList.map((p) => {
                  const isCompleted = p.status === 'completed' || p.payment_status === 'successful';
                  const isPending = p.status === 'pending';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono text-slate-900 font-medium">
                        {p.purchase_code || String(p.id)}
                      </td>
                      <td className="py-2.5 font-medium text-slate-900">
                        {p.package_name || 'Subscription Plan'}
                      </td>
                      <td className="py-2.5 capitalize text-slate-600">
                        {p.billing_cycle || 'monthly'}
                      </td>
                      <td className="py-2.5 font-mono font-medium text-slate-900">
                        {p.payment_currency === 'BDT' || (p.payment_method || '').toUpperCase() === 'BKASH' || String(p.notes || '').toUpperCase().includes('BKASH')
                          ? `৳${Number(p.payment_amount || p.total_amount || 0).toLocaleString()} BDT`
                          : `$${Number(p.payment_amount || p.total_amount || 0).toFixed(2)} USD`}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {p.payment_method || 'Paddle'}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 text-[10px]">
                        {p.transaction_id || '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {p.payment_id ? (
                          <Link
                            href={`/creator/${creatorId}/payments/${p.payment_id}`}
                            className="text-slate-800 hover:underline font-medium"
                          >
                            View Invoice
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. RENEWAL MODAL WITH PAYMENT GATEWAY */}
      {renewalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-slate-200 rounded max-w-lg w-full p-5 space-y-4 text-xs text-slate-800 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Renew Subscription Plan
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeSubscription?.package_name || 'Package'} &middot; Extend Duration
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRenewalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            {renewalError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {renewalError}
              </div>
            )}

            {!activePaymentId ? (
              /* Step 1: Renewal Terms & Gateway Selection */
              <div className="space-y-4">
                {/* Billing Duration Option */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    Select Renewal Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRenewalCycle('monthly')}
                      className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                        renewalCycle === 'monthly'
                          ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-semibold">Monthly Renewal</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">+30 Days Duration</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRenewalCycle('yearly')}
                      className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                        renewalCycle === 'yearly'
                          ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-semibold">Annual Renewal</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">+365 Days Duration</span>
                    </button>
                  </div>
                </div>

                {/* Gateway Selection (Direct Pricing, Zero Formula) */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    Select Payment Gateway
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRenewalGateway('BKASH')}
                      className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                        renewalGateway === 'BKASH'
                          ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-semibold">bKash (বিকাশ)</span>
                      <span className="block font-mono text-xs text-slate-900 mt-0.5">
                        ৳{pkgBdtPrice} BDT
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRenewalGateway('PADDLE')}
                      className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                        renewalGateway === 'PADDLE'
                          ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-semibold">Paddle / Card</span>
                      <span className="block font-mono text-xs text-slate-900 mt-0.5">
                        ${pkgUsdPrice.toFixed(2)} USD
                      </span>
                    </button>
                  </div>
                </div>

                {/* Duration Summary */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Package:</span>
                    <span className="text-slate-900 font-sans font-medium">{activeSubscription?.package_name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Extension:</span>
                    <span className="text-slate-900">{isYearly ? '365 Days' : '30 Days'}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                    <span>Payable Total:</span>
                    <span>
                      {renewalGateway === 'BKASH' ? `৳${pkgBdtPrice} BDT` : `$${pkgUsdPrice.toFixed(2)} USD`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRenewalModalOpen(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartRenewalPayment}
                    disabled={creatingOrder}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                  >
                    {creatingOrder ? 'Initiating Gateway...' : 'Proceed to Payment Gateway'}
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Payment Gateway Execution */
              <div className="space-y-3">
                <PaymentGatewayCheckout
                  creatorId={creatorId}
                  paymentId={activePaymentId}
                  initialGateway={renewalGateway}
                  onSuccess={handlePaymentCompleted}
                  onClose={() => setActivePaymentId(null)}
                  isModal={true}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

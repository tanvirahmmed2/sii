'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPkgId = searchParams.get('packageId');
  const initialInterval = (searchParams.get('interval') || 'monthly').toUpperCase();

  const [creator, setCreator] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPkgId, setSelectedPkgId] = useState(initialPkgId ? Number(initialPkgId) : null);
  const [billingCycle, setBillingCycle] = useState(initialInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
  const [paymentMethod, setPaymentMethod] = useState('surjopay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkCreatorSession() {
      setCheckingAuth(true);
      try {
        const res = await fetch('/api/marketing/creator/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'me' }),
        });
        const data = await res.json();
        if (data.success && data.creator) {
          setCreator(data.creator);
        } else {
          setCreator(null);
        }
      } catch {
        setCreator(null);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkCreatorSession();
  }, []);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const res = await fetch('/api/marketing/packages');
        const data = await res.json();
        let list = data.packages || [];

        if (initialPkgId && !list.some((p) => p.id === Number(initialPkgId))) {
          try {
            const singleRes = await fetch(`/api/marketing/packages?id=${initialPkgId}`);
            const singleData = await singleRes.json();
            if (singleData.success && (singleData.package || singleData.record)) {
              list = [singleData.package || singleData.record, ...list];
            }
          } catch {
          }
        }

        setPackages(list);
        if (initialPkgId && list.some((p) => p.id === Number(initialPkgId))) {
          setSelectedPkgId(Number(initialPkgId));
        } else if (list.length > 0) {
          setSelectedPkgId((current) => current || list[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPackages(false);
      }
    };

    loadPackages();
  }, [initialPkgId]);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || null;

  const isYearly = billingCycle === 'YEARLY';
  const usdPrice = isYearly
    ? Number(selectedPkg?.yearly_price_usd ?? selectedPkg?.yearly_price ?? 0)
    : Number(selectedPkg?.monthly_price_usd ?? selectedPkg?.monthly_price ?? 0);
  const bdtPrice = isYearly
    ? Number(selectedPkg?.yearly_price_bdt ?? 0)
    : Number(selectedPkg?.monthly_price_bdt ?? 0);

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (!creator) {
      router.push(`/creator/login?redirect=${encodeURIComponent(`/creator/checkout?packageId=${selectedPkgId || ''}`)}`);
      return;
    }

    if (!selectedPkg) {
      setError('Please select a subscription package before continuing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isBdt = paymentMethod === 'surjopay';
      const res = await fetch('/api/marketing/creator/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          packageId: selectedPkg.id,
          billingCycle: billingCycle.toLowerCase(),
          gatewayCode: paymentMethod,
          currency: isBdt ? 'BDT' : 'USD',
        }),
      });

      const data = await res.json();
      if (data.success && (data.paymentId || data.payment?.id)) {
        const payId = data.paymentId || data.payment?.id;
        router.push(`/creator/${creator.id}/payments/${payId}/pay?gateway=${paymentMethod}`);
      } else {
        setError(data.error || 'Failed to initiate payment. Please try again.');
      }
    } catch {
      setError('Network error processing checkout order.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || loadingPackages) {
    return <LoadingScreen fullScreen={true} label="Loading checkout details..." />;
  }

  if (!creator) {
    return (
      <div className="w-full my-8 px-4 sm:px-6 bg-white border border-slate-200 rounded p-6 text-center space-y-3 text-xs text-slate-800">
        <h1 className="text-sm font-semibold text-slate-900">Creator Authentication Required</h1>
        <p className="text-slate-500">
          Login to your creator account to complete your package order.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <Link
            href={`/creator/login?redirect=${encodeURIComponent(`/creator/checkout?packageId=${selectedPkgId || ''}`)}`}
            className="w-full py-2 px-3 rounded bg-slate-900 text-white font-medium"
          >
            Login &rarr;
          </Link>
          <Link
            href="/creator/register"
            className="w-full py-2 px-3 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-4 sm:px-6 space-y-4 text-xs text-slate-800">
      <div className="flex items-center justify-between">
        <Link href="/packages" className="text-slate-600 hover:text-slate-900 font-medium">
          &larr; Back to Packages
        </Link>
        <span className="text-[10px] text-slate-400 font-mono">Order Checkout</span>
      </div>

      <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Checkout & Order Review</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Select your package, cycle, and payment method to generate your invoice.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirmOrder} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Select Package Tier
            </label>
            <div className="space-y-1.5">
              {packages.map((pkg) => (
                <label
                  key={pkg.id}
                  className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                    selectedPkgId === pkg.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="packageSelect"
                      checked={selectedPkgId === pkg.id}
                      onChange={() => setSelectedPkgId(pkg.id)}
                      className="text-slate-900"
                    />
                    <div>
                      <span className="font-semibold text-slate-900">{pkg.name}</span>
                      <span className="block text-[11px] text-slate-500">{pkg.tagline || pkg.description}</span>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-slate-900 text-xs">
                    {paymentMethod === 'surjopay'
                      ? `৳${isYearly ? (pkg.yearly_price_bdt || 0) : (pkg.monthly_price_bdt || 0)} BDT`
                      : `$${isYearly ? (pkg.yearly_price_usd || pkg.yearly_price || 0) : (pkg.monthly_price_usd || pkg.monthly_price || 0)} USD`}
                    <span className="text-[10px] text-slate-500 font-sans ml-1">/{isYearly ? 'yr' : 'mo'}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Billing Interval
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`py-2 px-3 rounded border text-left cursor-pointer ${
                  billingCycle === 'MONTHLY'
                    ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Monthly Plan
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`py-2 px-3 rounded border text-left cursor-pointer ${
                  billingCycle === 'YEARLY'
                    ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Annual Plan (Save 15%)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Select Central Payment Gateway
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('surjopay')}
                className={`py-2 px-3 rounded border text-left cursor-pointer transition ${
                  paymentMethod === 'surjopay'
                    ? 'border-emerald-600 bg-emerald-50/50 font-semibold text-slate-900 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-emerald-700">shurjoPay</div>
                <div className="text-[10px] text-slate-500">bKash, Nagad, Cards</div>
                <div className="text-[11px] font-mono text-slate-800 mt-1">৳{bdtPrice} BDT</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paypal')}
                className={`py-2 px-3 rounded border text-left cursor-pointer transition ${
                  paymentMethod === 'paypal'
                    ? 'border-blue-600 bg-blue-50/50 font-semibold text-slate-900 ring-1 ring-blue-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-blue-700">PayPal</div>
                <div className="text-[10px] text-slate-500">Global USD Checkout</div>
                <div className="text-[11px] font-mono text-slate-800 mt-1">${usdPrice.toFixed(2)} USD</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paddle')}
                className={`py-2 px-3 rounded border text-left cursor-pointer transition ${
                  paymentMethod === 'paddle'
                    ? 'border-indigo-600 bg-indigo-50/50 font-semibold text-slate-900 ring-1 ring-indigo-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-indigo-700">Paddle Billing</div>
                <div className="text-[10px] text-slate-500">Global Cards & Pay</div>
                <div className="text-[11px] font-mono text-slate-800 mt-1">${usdPrice.toFixed(2)} USD</div>
              </button>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Account:</span>
              <span className="text-slate-900 font-sans">{creator.email}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Selected Package:</span>
              <span className="text-slate-900 font-sans">{selectedPkg?.name}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
              <span>Payable Amount:</span>
              <span>
                {paymentMethod === 'surjopay' ? `৳${bdtPrice} BDT` : `$${usdPrice.toFixed(2)} USD`}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Generating Order...' : 'Generate Invoice & Proceed'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CreatorCheckoutPage() {
  return (
    <Suspense
      fallback={<LoadingScreen fullScreen={true} label="Loading checkout..." />}
    >
      <CheckoutContent />
    </Suspense>
  );
}

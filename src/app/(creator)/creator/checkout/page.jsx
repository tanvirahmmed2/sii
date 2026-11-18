'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoadingScreen from 'src/component/common/LoadingScreen';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  let resolvedPkgId = searchParams.get('packageId') || searchParams.get('id');
  if (!resolvedPkgId) {
    const keys = Array.from(searchParams.keys());
    if (keys.length > 0 && /^\d+$/.test(keys[0])) {
      resolvedPkgId = keys[0];
    }
  }

  const initialInterval = (searchParams.get('interval') || 'monthly').toUpperCase();

  const [creator, setCreator] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPkgId, setSelectedPkgId] = useState(resolvedPkgId ? Number(resolvedPkgId) : null);
  const [billingCycle, setBillingCycle] = useState(initialInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
  const [selectedCurrency, setSelectedCurrency] = useState('BDT');
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

        if (resolvedPkgId && !list.some((p) => p.id === Number(resolvedPkgId))) {
          try {
            const singleRes = await fetch(`/api/marketing/packages?id=${resolvedPkgId}`);
            const singleData = await singleRes.json();
            if (singleData.success && (singleData.package || singleData.record)) {
              list = [singleData.package || singleData.record, ...list];
            }
          } catch {
          }
        }

        setPackages(list);
        if (resolvedPkgId && list.some((p) => p.id === Number(resolvedPkgId))) {
          setSelectedPkgId(Number(resolvedPkgId));
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
  }, [resolvedPkgId]);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || null;

  const isYearly = billingCycle === 'YEARLY';
  const usdPrice = isYearly
    ? Number(selectedPkg?.yearly_price_usd ?? selectedPkg?.yearly_price ?? 0)
    : Number(selectedPkg?.monthly_price_usd ?? selectedPkg?.monthly_price ?? 0);
  const bdtPrice = isYearly
    ? Number(selectedPkg?.yearly_price_bdt ?? 0)
    : Number(selectedPkg?.monthly_price_bdt ?? 0);

  const activeAmount = selectedCurrency === 'BDT' ? bdtPrice : usdPrice;

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (!creator) {
      router.push(`/creator/login?redirect=${encodeURIComponent(`/creator/checkout?${selectedPkgId || ''}`)}`);
      return;
    }

    if (!selectedPkg) {
      setError('Please select a subscription package before continuing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/marketing/creator/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          packageId: selectedPkg.id,
          billingCycle: billingCycle.toLowerCase(),
          gatewayCode: 'eps',
          currency: selectedCurrency,
        }),
      });

      const data = await res.json();
      if (data.success && (data.paymentId || data.payment?.id)) {
        const payId = data.paymentId || data.payment?.id;
        router.push(`/creator/${creator.id}/payments/${payId}/pay`);
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
      <div className="w-full my-8 px-4 sm:px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 text-xs text-slate-800 dark:text-slate-200 max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-lg">
          🔐
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">Creator Sign In Required</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Sign in to your creator account or register to complete your package purchase.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Link
            href={`/creator/login?redirect=${encodeURIComponent(`/creator/checkout?${selectedPkgId || ''}`)}`}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition cursor-pointer text-center"
          >
            Sign In &rarr;
          </Link>
          <Link
            href="/creator/register"
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition cursor-pointer text-center"
          >
            Create New Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex items-center justify-between">
        <Link href="/packages" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium flex items-center gap-1.5 transition">
          <span>&larr;</span>
          <span>Back to Packages</span>
        </Link>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
          EPS Central Checkout
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Package Checkout & Order Summary</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Choose your billing interval and confirm your package order to proceed to the EPS payment gateway.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirmOrder} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Package Tier
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {packages.map((pkg) => (
                <label
                  key={pkg.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedPkgId === pkg.id
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="packageSelect"
                      checked={selectedPkgId === pkg.id}
                      onChange={() => setSelectedPkgId(pkg.id)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{pkg.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{pkg.tagline || pkg.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {selectedCurrency === 'BDT'
                        ? `৳${isYearly ? (pkg.yearly_price_bdt || 0) : (pkg.monthly_price_bdt || 0)} BDT`
                        : `$${isYearly ? (pkg.yearly_price_usd || pkg.yearly_price || 0) : (pkg.monthly_price_usd || pkg.monthly_price || 0)} USD`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans block">/{isYearly ? 'year' : 'month'}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Billing Cycle
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`py-2.5 px-3 rounded-xl border text-center font-medium transition cursor-pointer ${
                    billingCycle === 'MONTHLY'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Monthly Plan
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`py-2.5 px-3 rounded-xl border text-center font-medium transition cursor-pointer ${
                    billingCycle === 'YEARLY'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Yearly Plan (Discounted)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Currency Selection
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('BDT')}
                  className={`py-2.5 px-3 rounded-xl border text-center font-medium transition cursor-pointer ${
                    selectedCurrency === 'BDT'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  BDT (৳ Taka)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('USD')}
                  className={`py-2.5 px-3 rounded-xl border text-center font-medium transition cursor-pointer ${
                    selectedCurrency === 'USD'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  USD ($ Dollar)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Payment Gateway
            </label>
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-linear-to-r from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
                  EPS
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <span>Easy Payment System (EPS) Gateway</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                      Main Platform
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supports Bangladeshi MFS (bKash, Nagad, Rocket, Upay), Bank Accounts, & Foreign Cards
                  </div>
                </div>
              </div>
              <div className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {selectedCurrency === 'BDT' ? `৳${bdtPrice} BDT` : `$${usdPrice.toFixed(2)} USD`}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Creator Account:</span>
              <span className="text-slate-900 dark:text-white font-medium">{creator.email}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Selected Plan:</span>
              <span className="text-slate-900 dark:text-white font-medium">{selectedPkg?.name} ({billingCycle.toLowerCase()})</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Platform Currency:</span>
              <span className="text-slate-900 dark:text-white font-medium">{selectedCurrency}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-white text-sm">
              <span>Total Payable Now:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {selectedCurrency === 'BDT' ? `৳${bdtPrice.toFixed(2)} BDT` : `$${usdPrice.toFixed(2)} USD`}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide transition shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Initiating Order & Payment...</span>
            ) : (
              <span>Proceed to Pay with EPS &rarr;</span>
            )}
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

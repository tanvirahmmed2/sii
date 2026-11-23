'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BiShieldQuarter,
  BiArrowBack,
  BiLoaderAlt,
  BiInfoCircle,
  BiStar,
  BiLockAlt,
} from 'react-icons/bi';
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

  const [creator, setCreator] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
  const [selectedPkgId, setSelectedPkgId] = useState<number | null>(resolvedPkgId ? Number(resolvedPkgId) : null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>(initialInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
  const [selectedCurrency, setSelectedCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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
        if (resolvedPkgId && !list.some((p: any) => p.id === Number(resolvedPkgId))) {
          try {
            const singleRes = await fetch(`/api/marketing/packages?id=${resolvedPkgId}`);
            const singleData = await singleRes.json();
            if (singleData.success && (singleData.package || singleData.record)) {
              list = [singleData.package || singleData.record, ...list];
            }
          } catch {}
        }
        setPackages(list);
        if (resolvedPkgId && list.some((p: any) => p.id === Number(resolvedPkgId))) {
          setSelectedPkgId(Number(resolvedPkgId));
        } else if (list.length > 0) {
          setSelectedPkgId((curr) => curr || list[0].id);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingPackages(false);
      }
    };
    loadPackages();
  }, [resolvedPkgId]);

  const selectedPkg = packages.find((p: any) => p.id === selectedPkgId) || null;
  const isYearly = billingCycle === 'YEARLY';

  const monthlyBdt = Number(selectedPkg?.monthly_price_bdt ?? 0);
  const yearlyBdt = Number(selectedPkg?.yearly_price_bdt ?? 0);
  const monthlyUsd = Number(selectedPkg?.monthly_price_usd ?? selectedPkg?.monthly_price ?? 0);
  const yearlyUsd = Number(selectedPkg?.yearly_price_usd ?? selectedPkg?.yearly_price ?? 0);

  const activePrice = selectedCurrency === 'BDT'
    ? (isYearly ? yearlyBdt : monthlyBdt)
    : (isYearly ? yearlyUsd : monthlyUsd);

  const currencySymbol = selectedCurrency === 'BDT' ? '৳' : '$';

  const handleContinueToPay = async (e: React.FormEvent) => {
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
      const res = await fetch('/api/payment/sslcommerz/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          packageId: selectedPkg.id,
          billingCycle: billingCycle.toLowerCase(),
          currency: selectedCurrency,
          createOnly: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.paymentId) {
        router.push(`/creator/${creator.id}/payments/${data.paymentId}`);
        return;
      } else {
        setError(data.error || 'Failed to initialize unpaid purchase. Please try again.');
      }
    } catch {
      setError('Network error processing checkout order.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || loadingPackages) {
    return <LoadingScreen fullScreen={true} label="Loading checkout..." />;
  }

  if (!creator) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center text-2xl">
            <BiLockAlt />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to Continue</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Sign in with your creator account to complete your subscription order.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link
              href={`/creator/login?redirect=${encodeURIComponent(`/creator/checkout?${selectedPkgId || ''}`)}`}
              className="w-full py-3 px-4 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs tracking-wide transition shadow-md shadow-secondary/20 text-center"
            >
              Sign In to Creator Portal &rarr;
            </Link>
            <Link
              href="/creator/register"
              className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition text-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <BiArrowBack className="text-base" />
            <span>Back to Plans</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 shadow-xs">
            <BiShieldQuarter className="text-sm text-secondary" />
            <span>Secure Checkout</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-wider">
            <BiStar className="text-sm" />
            <span>Subscription Checkout</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Complete Your Package Order
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Review your institution package details, choose your billing cycle, and continue to payment.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
            <BiInfoCircle className="text-lg shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleContinueToPay} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Package
            </label>
            <div className="grid grid-cols-1 gap-3">
              {packages.map((pkg: any) => {
                const isSelected = selectedPkgId === pkg.id;
                const itemPrice = selectedCurrency === 'BDT'
                  ? (isYearly ? Number(pkg.yearly_price_bdt || 0) : Number(pkg.monthly_price_bdt || 0))
                  : (isYearly ? Number(pkg.yearly_price_usd || pkg.yearly_price || 0) : Number(pkg.monthly_price_usd || pkg.monthly_price || 0));

                return (
                  <label
                    key={pkg.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary/5 dark:bg-secondary/10 ring-2 ring-secondary/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="radio"
                        name="packageSelection"
                        checked={isSelected}
                        onChange={() => setSelectedPkgId(pkg.id)}
                        className="w-4 h-4 text-secondary focus:ring-secondary cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {pkg.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {pkg.tagline || pkg.description || 'Dedicated multi-tenant institution platform'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {currencySymbol}{itemPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Billing Cycle
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    billingCycle === 'YEARLY'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Currency
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('BDT')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedCurrency === 'BDT'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  BDT (৳)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('USD')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedCurrency === 'USD'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Creator Account</span>
              <span className="text-slate-900 dark:text-white font-medium">{creator.email}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Selected Plan</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {selectedPkg?.name || 'Standard'} ({isYearly ? 'Annual' : 'Monthly'})
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Calculated Price</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">
                {currencySymbol}{activePrice.toLocaleString()} {selectedCurrency}
              </span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700/80 pt-2.5 flex justify-between items-baseline font-bold text-slate-900 dark:text-white">
              <span className="text-sm">Total Payable</span>
              <span className="text-xl font-mono text-secondary">
                {currencySymbol}{activePrice.toLocaleString()} {selectedCurrency}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs uppercase tracking-wider transition shadow-xl shadow-secondary/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <BiLoaderAlt className="animate-spin text-base" />
                <span>Creating Unpaid Purchase...</span>
              </>
            ) : (
              <span>Continue to Pay &rarr;</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CreatorCheckoutPage() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen={true} label="Loading checkout..." />}>
      <CheckoutContent />
    </Suspense>
  );
}

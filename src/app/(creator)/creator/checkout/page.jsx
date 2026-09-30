'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BiCube,
  BiCheckCircle,
  BiLoaderAlt,
  BiShieldQuarter,
  BiArrowBack,
  BiUser,
  BiLayer,
  BiPackage,
  BiCreditCard,
  BiStar,
} from 'react-icons/bi';

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
  const [paymentMethod, setPaymentMethod] = useState('BKASH'); // 'BKASH' | 'PAYONEER'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Verify creator session
  useEffect(() => {
    async function checkCreatorSession() {
      setCheckingAuth(true);
      try {
        const res = await fetch('/api/creator/auth', {
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

  // 2. Fetch available packages
  useEffect(() => {
    fetch('/api/marketing/packages')
      .then((res) => res.json())
      .then((data) => {
        const list = data.packages || [];
        setPackages(list);
        if (initialPkgId && list.some((p) => p.id === Number(initialPkgId))) {
          setSelectedPkgId(Number(initialPkgId));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPackages(false));
  }, [initialPkgId]);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || null;

  // Pricing calculations
  const isYearly = billingCycle === 'YEARLY';
  const monthlyUsd = Number(selectedPkg?.monthly_price_usd ?? (selectedPkg ? (selectedPkg.price_in_cents || 0) / 100 : 0));
  const yearlyUsd = Number(selectedPkg?.yearly_price_usd ?? Math.round(monthlyUsd * 10));
  const displayPrice = isYearly ? yearlyUsd.toFixed(2) : monthlyUsd.toFixed(2);

  const features = Array.isArray(selectedPkg?.features) && selectedPkg.features.length > 0
    ? selectedPkg.features.map((f) => f.name || f.description || f)
    : Array.isArray(selectedPkg?.allowed_modules) && selectedPkg.allowed_modules.length > 0
    ? selectedPkg.allowed_modules.map((m) => `Includes ${m} Module`)
    : ['Standard Website Provisioning', 'Creator Drag-and-Drop Studio', 'Full SSL & Custom Subdomain'];

  // Handle Order Placement
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
      // Create UNPAID purchase and UNPAID payment invoice
      const res = await fetch('/api/creator/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_order',
          creatorId: creator.id,
          packageId: selectedPkg.id,
          billingInterval: billingCycle,
          paymentMethod: paymentMethod,
        }),
      });

      const data = await res.json();
      if (data.success && data.payment?.id) {
        // Redirect to /creator/[creatorId]/payments/[paymentId] invoice page
        router.push(`/creator/${creator.id}/payments/${data.payment.id}`);
      } else {
        setError(data.error || 'Failed to generate order invoice. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error processing checkout order.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || loadingPackages) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <BiLoaderAlt className="animate-spin text-3xl text-secondary" />
        <p className="text-xs text-slate-500 font-medium">Loading checkout details...</p>
      </div>
    );
  }

  // If not logged in as a creator
  if (!creator) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center mx-auto text-3xl shadow-sm">
          <BiUser />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Creator Login Required</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            You must be logged in with your creator account to purchase a platform package and create your website subscription.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href={`/creator/login?redirect=${encodeURIComponent(`/creator/checkout?packageId=${selectedPkgId || ''}`)}`}
            className="flex-1 py-3 px-4 rounded-2xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all text-center cursor-pointer"
          >
            Log In as Creator &rarr;
          </Link>
          <Link
            href="/creator/register"
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all text-center cursor-pointer"
          >
            Register Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Navigation and Security Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/packages"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-secondary transition-colors"
        >
          <BiArrowBack className="text-base" />
          <span>Back to Packages</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-slate-800 dark:text-primary-light text-[11px] font-semibold">
          <BiShieldQuarter className="text-secondary" />
          <span>Secure Platform Checkout</span>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Review & Complete Order
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Confirm your package plan. An unpaid invoice will be created for Payoneer payment settlement and immediate subscription activation.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center max-w-lg mx-auto">
          {error}
        </div>
      )}

      {/* State A: If NO package is selected */}
      {!selectedPkg ? (
        <div className="max-w-xl mx-auto text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary text-3xl">
            <BiPackage />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">No Package Selected</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              You haven&apos;t selected a subscription package yet. Browse all available ecosystem packages to select the tier that fits your website goals.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary-dark text-white text-xs font-semibold shadow-lg shadow-secondary/25 transition-all cursor-pointer"
            >
              <BiCube className="text-base" />
              <span>Select a Package Now &rarr;</span>
            </Link>
          </div>

          {/* Quick Selection List */}
          {packages.length > 0 && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-left space-y-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block text-center">
                Or select directly below:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPkgId(pkg.id)}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-secondary/50 dark:hover:border-secondary/50 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-secondary transition-colors">
                          {pkg.name}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                          ${Number(pkg.monthly_price_usd ?? (pkg.price_in_cents || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {pkg.description || 'Full website system'}
                      </p>
                    </div>
                    <div className="mt-3 text-[10px] font-semibold text-secondary flex items-center gap-1">
                      <span>Choose this plan</span>
                      <span>&rarr;</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* State B: When a package IS selected */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Package Card following Home Component styling */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative rounded-3xl p-7 sm:p-8 border bg-white dark:bg-slate-900 border-secondary/40 shadow-xl shadow-secondary/5 ring-1 ring-secondary/20 space-y-6">
              {/* Header with App badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  {selectedPkg.app_title && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-slate-800 dark:text-primary-light border border-primary/30">
                      <BiLayer className="text-xs text-secondary" />
                      <span>{selectedPkg.app_title}</span>
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                    {selectedPkg.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                    {selectedPkg.description || 'Complete digital portfolio and creator website system.'}
                  </p>
                </div>

                <Link
                  href="/packages"
                  className="text-xs font-semibold text-secondary hover:underline whitespace-nowrap cursor-pointer"
                >
                  Change Plan
                </Link>
              </div>

              {/* Billing Cycle Switcher */}
              <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 inline-flex items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-secondary text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Monthly Plan
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === 'YEARLY'
                      ? 'bg-secondary text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Annual Plan</span>
                  <span className="text-[10px] bg-primary/25 text-slate-900 dark:text-primary-light border border-primary/40 px-1.5 py-0.5 rounded-md font-semibold">
                    SAVE 20%
                  </span>
                </button>
              </div>

              {/* Pricing Display */}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white font-mono">
                  ${displayPrice}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isYearly ? '/ year' : '/ month'}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  {selectedPkg.currency || 'USD'}
                </span>
              </div>

              {/* Quota Badge */}
              <div className="text-xs text-secondary dark:text-secondary-light bg-secondary/10 px-3.5 py-1.5 rounded-xl border border-secondary/20 w-fit font-semibold">
                {selectedPkg.max_websites ?? selectedPkg.max_portfolios ?? 1}{' '}
                {(selectedPkg.max_websites ?? selectedPkg.max_portfolios ?? 1) === 1 ? 'Website' : 'Websites'} Included
              </div>

              {/* Included Features */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  What is included in this tier:
                </span>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                  {features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <BiCheckCircle className="text-base text-secondary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary & Checkout Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 border border-slate-800">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Order Summary</span>
                <h3 className="text-xl font-semibold text-white mt-1">{selectedPkg.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {creator.name} ({creator.email})
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Billing Interval:</span>
                  <span className="text-white font-semibold capitalize">{billingCycle.toLowerCase()}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Payment Gateway</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BKASH')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'BKASH'
                          ? 'bg-[#E2136E] text-white border-[#E2136E] shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>bKash (বিকাশ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PAYONEER')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'PAYONEER'
                          ? 'bg-secondary text-white border-secondary shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>Payoneer Card</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-white">Total:</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white font-mono">
                      ${displayPrice} <span className="text-xs text-slate-400 font-normal">USD</span>
                    </div>
                    {paymentMethod === 'BKASH' && (
                      <span className="text-xs font-semibold text-[#E2136E]">
                        ≈ ৳{Math.round(Number(displayPrice) * 120)} BDT
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={loading}
                className={`w-full py-3.5 rounded-2xl active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                  paymentMethod === 'BKASH'
                    ? 'bg-[#E2136E] hover:bg-[#c2105e] shadow-lg shadow-[#E2136E]/30'
                    : 'bg-secondary hover:bg-secondary-dark shadow-lg shadow-secondary/30'
                }`}
              >
                {loading ? (
                  <>
                    <BiLoaderAlt className="animate-spin text-base" />
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <span>Continue to {paymentMethod === 'BKASH' ? 'bKash' : 'Payoneer'} Payment &rarr;</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <BiLoaderAlt className="animate-spin text-3xl text-secondary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

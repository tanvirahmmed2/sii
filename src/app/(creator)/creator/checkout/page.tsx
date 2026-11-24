'use client';

import { Suspense, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BiShieldQuarter,
  BiArrowBack,
  BiLoaderAlt,
  BiInfoCircle,
  BiStar,
  BiLockAlt,
  BiHeart,
  BiCheckCircle,
  BiTag,
  BiX,
} from 'react-icons/bi';
import LoadingScreen from 'src/component/common/LoadingScreen';
import { Context } from 'src/component/helper/Context';

const DEFAULT_CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
};

function CheckoutContent() {
  const router = useRouter();
  const context = useContext<any>(Context) || {};
  const contextCurrency = context.currency;
  const contextCurrencySymbol = context.currencySymbol;

  const [creator, setCreator] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [wishlistPackages, setWishlistPackages] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState<boolean>(true);
  const [selectedPkgId, setSelectedPkgId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [savedCurrency, setSavedCurrency] = useState<string>('BDT');

  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('preferred_currency') : null;
      const initialCurr = stored || contextCurrency || 'BDT';
      setSavedCurrency(String(initialCurr).toUpperCase());
    } catch {
      setSavedCurrency('BDT');
    }
  }, [contextCurrency]);

  useEffect(() => {
    async function initCheckout() {
      setCheckingAuth(true);
      try {
        const authRes = await fetch('/api/marketing/creator/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'me' }),
        });
        const authData = await authRes.json();
        if (authData.success && authData.creator) {
          setCreator(authData.creator);

          try {
            const wishRes = await fetch(`/api/marketing/creator/wishlist?creatorId=${authData.creator.id}`);
            const wishData = await wishRes.json();
            if (wishData.success && Array.isArray(wishData.wishlists) && wishData.wishlists.length > 0) {
              setWishlistPackages(wishData.wishlists);
              setSelectedPkgId(Number(wishData.wishlists[0].package_id));
            } else if (wishData.success && wishData.wishlist) {
              setWishlistPackages([wishData.wishlist]);
              setSelectedPkgId(Number(wishData.wishlist.package_id));
            } else {
              setWishlistPackages([]);
              setSelectedPkgId(null);
            }
          } catch {
            setWishlistPackages([]);
          }
        } else {
          setCreator(null);
        }
      } catch {
        setCreator(null);
      } finally {
        setCheckingAuth(false);
        setLoadingWishlist(false);
      }
    }
    initCheckout();
  }, []);

  const activeCurrency = savedCurrency || 'BDT';
  const currencySymbol = contextCurrencySymbol || DEFAULT_CURRENCY_SYMBOLS[activeCurrency] || '$';

  const selectedPkg =
    wishlistPackages.find((p: any) => Number(p.package_id || p.id) === selectedPkgId) ||
    (wishlistPackages.length > 0 ? wishlistPackages[0] : null);

  const isYearly = billingCycle === 'YEARLY';
  const currKey = `${activeCurrency.toLowerCase()}_per_month`;
  const monthlyRate = Number(selectedPkg ? selectedPkg[currKey] ?? selectedPkg.bdt_per_month ?? 0 : 0);
  const baseAmount = Number((isYearly ? monthlyRate * 12 : monthlyRate).toFixed(2));

  const discountPercentage = appliedPromo ? Number(appliedPromo.discount_percentage || 0) : 0;
  const discountAmount = appliedPromo
    ? Number(((baseAmount * discountPercentage) / 100).toFixed(2))
    : 0;
  const finalAmount = Math.max(0, Number((baseAmount - discountAmount).toFixed(2)));

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError('Please type a promo code.');
      setPromoMessage('');
      return;
    }

    if (appliedPromo) {
      setPromoError('A promo code is already applied to this order. Remove it first to apply another.');
      return;
    }

    setValidatingPromo(true);
    setPromoError('');
    setPromoMessage('');

    try {
      const res = await fetch('/api/marketing/creator/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          creatorId: creator?.id || null,
          packageId: selectedPkgId,
          billingCycle: billingCycle.toLowerCase(),
          currency: activeCurrency,
        }),
      });

      const data = await res.json();
      if (data.success && data.promo) {
        setAppliedPromo(data.promo);
        setPromoMessage(data.message || `${data.promo.code} applied! ${data.promo.discount_percentage}% discount granted.`);
        setPromoError('');
      } else {
        setPromoError(data.error || 'Invalid or expired promo code.');
        setAppliedPromo(null);
      }
    } catch {
      setPromoError('Unable to validate promo code due to a network error.');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoMessage('');
    setPromoError('');
  };

  const handleContinueToPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator) {
      router.push(`/creator/login?redirect=${encodeURIComponent('/creator/checkout')}`);
      return;
    }
    if (!selectedPkg) {
      setError('No wishlisted package selected.');
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
          packageId: Number(selectedPkg.package_id || selectedPkg.id),
          billingCycle: billingCycle.toLowerCase(),
          currency: activeCurrency,
          promoCode: appliedPromo?.code || null,
          createOnly: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.paymentId) {
        router.push(`/creator/${creator.id}/payments/${data.paymentId}`);
        return;
      } else {
        setError(data.error || 'Failed to initialize unpaid invoice. Please try again.');
      }
    } catch {
      setError('Network error processing checkout order.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || loadingWishlist) {
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
              href={`/creator/login?redirect=${encodeURIComponent('/creator/checkout')}`}
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

  if (wishlistPackages.length === 0) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-500 flex items-center justify-center text-3xl">
            <BiHeart />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Wishlist is Empty</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              Please browse our packages and add your preferred educational platform plan to your wishlist to proceed with checkout.
            </p>
          </div>
          <div>
            <Link
              href="/packages"
              className="inline-flex items-center justify-center py-3.5 px-6 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-secondary/20"
            >
              Browse Packages &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <BiArrowBack className="text-base" />
            <span>Browse Packages</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 shadow-xs">
            <BiShieldQuarter className="text-sm text-secondary" />
            <span>Secure Checkout</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-wider">
            <BiStar className="text-sm" />
            <span>Wishlist Checkout</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Checkout Your Plan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Review your wishlisted package in your saved currency ({activeCurrency}) and proceed to pay.
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Wishlisted Plan
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                <BiHeart className="text-xs" />
                <span>Wishlist</span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {wishlistPackages.map((pkg: any) => {
                const pkgIdNumber = Number(pkg.package_id || pkg.id);
                const isSelected = selectedPkgId === pkgIdNumber;
                const itemMonthly = Number(pkg[currKey] ?? pkg.bdt_per_month ?? 0);
                const itemPrice = isYearly ? itemMonthly * 12 : itemMonthly;

                return (
                  <label
                    key={pkgIdNumber}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary/5 dark:bg-secondary/10 ring-2 ring-secondary/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {wishlistPackages.length > 1 && (
                        <input
                          type="radio"
                          name="wishlistSelection"
                          checked={isSelected}
                          onChange={() => setSelectedPkgId(pkgIdNumber)}
                          className="w-4 h-4 text-secondary focus:ring-secondary cursor-pointer"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {pkg.name}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <BiHeart className="text-xs" />
                            <span>In Wishlist</span>
                          </span>
                          {pkg.is_popular && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {pkg.tagline || pkg.description || 'Institutional platform and website suite'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {currencySymbol}{itemPrice.toLocaleString()} {activeCurrency}
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
                  Annual (12 Mo)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Saved Currency
              </label>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {activeCurrency} ({currencySymbol})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  From site preferences
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BiTag className="text-sm text-secondary" />
                <span>Promo Code</span>
              </label>
              {appliedPromo && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <BiCheckCircle className="text-xs" />
                  <span>{appliedPromo.discount_percentage}% Discount Active</span>
                </span>
              )}
            </div>

            {!appliedPromo ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        setPromoError('');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={validatingPromo || !promoInput.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wide transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {validatingPromo ? (
                      <BiLoaderAlt className="animate-spin text-sm" />
                    ) : (
                      <span>Apply</span>
                    )}
                  </button>
                </div>
                {promoError && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <BiInfoCircle className="text-xs" />
                    <span>{promoError}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <BiCheckCircle className="text-emerald-600 dark:text-emerald-400 text-base shrink-0" />
                  <div>
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                      {appliedPromo.code}
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                      {appliedPromo.name} ({appliedPromo.discount_percentage}% off)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  title="Remove Promo"
                >
                  <BiX className="text-base" />
                </button>
              </div>
            )}
            {promoMessage && !promoError && (
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {promoMessage}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Creator Account</span>
              <span className="text-slate-900 dark:text-white font-medium">{creator.email}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Wishlisted Plan</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {selectedPkg?.name || 'Standard'} ({isYearly ? 'Annual' : 'Monthly'})
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Package Subtotal</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">
                {currencySymbol}{baseAmount.toLocaleString()} {activeCurrency}
              </span>
            </div>

            {appliedPromo && discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Promo Discount ({appliedPromo.discount_percentage}%)</span>
                <span className="font-mono font-bold">
                  -{currencySymbol}{discountAmount.toLocaleString()} {activeCurrency}
                </span>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700/80 pt-2.5 flex justify-between items-baseline font-bold text-slate-900 dark:text-white">
              <span className="text-sm">Total Payable</span>
              <span className="text-xl font-mono text-secondary">
                {currencySymbol}{finalAmount.toLocaleString()} {activeCurrency}
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
                <span>Creating Unpaid Invoice...</span>
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

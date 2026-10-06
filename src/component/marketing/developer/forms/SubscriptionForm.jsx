'use client';

import { useState, useEffect, useMemo } from 'react';

export default function SubscriptionForm({
  packages: initialPackages = null,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/marketing/developer/subscriptions',
}) {
  const [packages, setPackages] = useState(() => (Array.isArray(initialPackages) ? initialPackages : []));
  const [loadingPackages, setLoadingPackages] = useState(() => !(Array.isArray(initialPackages) && initialPackages.length > 0));

  // Creator Lookup States (Manual button check, NO live/debounced typing check)
  const [creatorEmail, setCreatorEmail] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [creatorFound, setCreatorFound] = useState(null);
  const [creatorError, setCreatorError] = useState('');

  // Form Fields (Available after creator verification)
  const [selectedPackageId, setSelectedPackageId] = useState(() =>
    Array.isArray(initialPackages) && initialPackages.length > 0 ? String(initialPackages[0].id) : ''
  );
  const [durationType, setDurationType] = useState('monthly'); // 'monthly', '2_months', '3_months', '6_months', 'yearly', '2_years', '3_years', 'custom'
  const [customUnit, setCustomUnit] = useState('months'); // 'months' or 'years'
  const [customMultiplier, setCustomMultiplier] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID'); // 'PAID' or 'UNPAID'
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 1. Fetch available packages ONCE on mount
  useEffect(() => {
    if (Array.isArray(initialPackages) && initialPackages.length > 0) {
      setPackages(initialPackages);
      setSelectedPackageId((prev) => prev || String(initialPackages[0].id));
      setLoadingPackages(false);
      return;
    }

    let isMounted = true;
    setLoadingPackages(true);
    fetch('/api/marketing/developer/packages')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const pkgs = data.records || data.packages || [];
        setPackages(pkgs);
        if (pkgs.length > 0) {
          setSelectedPackageId((prev) => prev || String(pkgs[0].id));
        }
      })
      .catch((err) => console.error('Error loading packages for subscription:', err))
      .finally(() => {
        if (isMounted) setLoadingPackages(false);
      });

    return () => {
      isMounted = false;
    };
  }, []); // Run strictly once on mount

  // 2. Manual Creator Email Availability Check (Triggered ONLY by Check button or Enter)
  const handleCheckCreator = async (e) => {
    if (e) e.preventDefault();
    const trimmed = creatorEmail.trim().toLowerCase();

    if (!trimmed) {
      setCreatorError('Please enter a creator email address to verify.');
      setCreatorFound(null);
      return;
    }

    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setCreatorError('Please enter a valid email address (e.g. principal@greenwood.edu).');
      setCreatorFound(null);
      return;
    }

    setCheckingEmail(true);
    setCreatorError('');
    setFormError('');

    try {
      const res = await fetch(`/api/marketing/developer/creators?email=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (data.success && data.found && data.creator) {
        setCreatorFound(data.creator);
        if (data.creator.is_active === false) {
          setCreatorError('Creator found, but this account is currently disabled/inactive. Subscriptions can only be assigned to active accounts.');
        } else {
          setCreatorError('');
        }
      } else {
        setCreatorFound(null);
        setCreatorError(data.message || 'No registered creator found with this email address.');
      }
    } catch (err) {
      setCreatorFound(null);
      setCreatorError('Network error checking creator availability.');
    } finally {
      setCheckingEmail(false);
    }
  };

  // Selected package object
  const currentPackage = useMemo(() => {
    return packages.find((p) => String(p.id) === String(selectedPackageId)) || null;
  }, [packages, selectedPackageId]);

  // Calculate duration parameters
  const durationInfo = useMemo(() => {
    const now = new Date();
    const end = new Date(now);

    let months = 1;
    let years = 0;
    let label = '1 Month';
    let billingCycle = 'monthly';
    let apiDurationType = 'monthly';
    let apiMultiplier = 1;

    switch (durationType) {
      case 'monthly':
        months = 1;
        label = '1 Month (Standard Monthly)';
        billingCycle = 'monthly';
        apiDurationType = 'monthly';
        apiMultiplier = 1;
        end.setMonth(end.getMonth() + 1);
        break;
      case '2_months':
        months = 2;
        label = '2 Months';
        billingCycle = 'custom';
        apiDurationType = 'multiple_months';
        apiMultiplier = 2;
        end.setMonth(end.getMonth() + 2);
        break;
      case '3_months':
        months = 3;
        label = '3 Months (Quarterly)';
        billingCycle = 'custom';
        apiDurationType = 'multiple_months';
        apiMultiplier = 3;
        end.setMonth(end.getMonth() + 3);
        break;
      case '6_months':
        months = 6;
        label = '6 Months (Semi-Annual)';
        billingCycle = 'custom';
        apiDurationType = 'multiple_months';
        apiMultiplier = 6;
        end.setMonth(end.getMonth() + 6);
        break;
      case 'yearly':
        years = 1;
        months = 12;
        label = '1 Year (Standard Yearly)';
        billingCycle = 'yearly';
        apiDurationType = 'yearly';
        apiMultiplier = 1;
        end.setFullYear(end.getFullYear() + 1);
        break;
      case '2_years':
        years = 2;
        months = 24;
        label = '2 Years';
        billingCycle = 'yearly';
        apiDurationType = 'multiple_years';
        apiMultiplier = 2;
        end.setFullYear(end.getFullYear() + 2);
        break;
      case '3_years':
        years = 3;
        months = 36;
        label = '3 Years';
        billingCycle = 'yearly';
        apiDurationType = 'multiple_years';
        apiMultiplier = 3;
        end.setFullYear(end.getFullYear() + 3);
        break;
      case 'custom':
        const mult = Math.max(1, parseInt(customMultiplier, 10) || 1);
        apiMultiplier = mult;
        if (customUnit === 'years') {
          years = mult;
          months = mult * 12;
          label = `${mult} Year${mult > 1 ? 's' : ''}`;
          billingCycle = 'yearly';
          apiDurationType = 'multiple_years';
          end.setFullYear(end.getFullYear() + mult);
        } else {
          months = mult;
          label = `${mult} Month${mult > 1 ? 's' : ''}`;
          billingCycle = mult === 12 ? 'yearly' : 'custom';
          apiDurationType = 'multiple_months';
          end.setMonth(end.getMonth() + mult);
        }
        break;
      default:
        months = 1;
        end.setMonth(end.getMonth() + 1);
    }

    return {
      months,
      years,
      label,
      billingCycle,
      apiDurationType,
      apiMultiplier,
      startDate: now,
      endDate: end,
    };
  }, [durationType, customUnit, customMultiplier]);

  // Suggested price based on package & duration
  const autoPrice = useMemo(() => {
    if (!currentPackage) return 0;
    const isYearlyBased = durationInfo.years > 0;

    if (currency === 'BDT') {
      if (isYearlyBased) {
        const yrPrice = Number(currentPackage.yearly_price_bdt ?? 0);
        return yrPrice * durationInfo.years;
      }
      const moPrice = Number(currentPackage.monthly_price_bdt ?? 0);
      return moPrice * durationInfo.months;
    }

    // USD
    if (isYearlyBased) {
      const yrPrice = Number(currentPackage.yearly_price_usd ?? currentPackage.yearly_price ?? 0);
      return yrPrice * durationInfo.years;
    }
    const moPrice = Number(currentPackage.monthly_price_usd ?? currentPackage.monthly_price ?? 0);
    return moPrice * durationInfo.months;
  }, [currentPackage, durationInfo, currency]);

  // Effective price used
  const effectivePrice = customAmount !== '' ? Number(customAmount) : autoPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!creatorFound?.id || !creatorFound.is_active) {
      setFormError('Please verify an active, registered creator before granting the subscription.');
      return;
    }

    if (!selectedPackageId) {
      setFormError('Please select a package plan.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        creator_id: creatorFound.id,
        creator_email: creatorFound.email,
        package_id: Number(selectedPackageId),
        duration_type: durationInfo.apiDurationType,
        duration_multiplier: durationInfo.apiMultiplier,
        period_start: durationInfo.startDate.toISOString(),
        period_end: durationInfo.endDate.toISOString(),
        currency,
        amount: Math.max(0, Number(effectivePrice) || 0),
        payment_status: paymentStatus, // 'PAID' or 'UNPAID'
        notes: notes.trim() || undefined,
      };

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess(data.message || 'Subscription processed successfully.');
        setCreatorEmail('');
        setCreatorFound(null);
        setCustomAmount('');
        setNotes('');

        if (onSuccess) {
          setTimeout(() => {
            onSuccess(data);
          }, 600);
        }
      } else {
        setFormError(data.error || 'Failed to create subscription.');
      }
    } catch (err) {
      setFormError(err.message || 'Network error submitting subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCreatorReady = Boolean(creatorFound && creatorFound.is_active);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Create &amp; Assign Subscription
            </h3>
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Developer Console
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Step 1: Check creator email availability. Step 2: Select plan, duration, and grant paid or unpaid invoice.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {formError && (
        <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
          {formError}
        </div>
      )}

      {formSuccess && (
        <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
          {formSuccess}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1: CREATOR EMAIL INPUT & CHECK BUTTON */}
        <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <label className="block text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            1. Creator Account Identification
          </label>

          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Creator Email Address
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="email"
                required
                placeholder="Enter registered creator email address..."
                value={creatorEmail}
                onChange={(e) => {
                  setCreatorEmail(e.target.value);
                  if (creatorFound) {
                    setCreatorFound(null);
                  }
                  setCreatorError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCheckCreator();
                  }
                }}
                className={`flex-1 bg-white dark:bg-slate-900 border rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${
                  isCreatorReady
                    ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                    : creatorError
                    ? 'border-rose-400'
                    : 'border-slate-300 dark:border-slate-700 focus:border-slate-800'
                }`}
              />

              <button
                type="button"
                onClick={handleCheckCreator}
                disabled={checkingEmail || !creatorEmail.trim()}
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium whitespace-nowrap disabled:opacity-50 transition-colors cursor-pointer"
              >
                {checkingEmail ? 'Checking...' : 'Check Availability'}
              </button>
            </div>
          </div>

          {/* BOX CONTAINING CREATOR DATA (WHEN FOUND) */}
          {creatorFound && (
            <div
              className={`p-3.5 rounded border text-xs space-y-2.5 transition-colors ${
                creatorFound.is_active
                  ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {creatorFound.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 font-medium">
                    ID #{creatorFound.id}
                  </span>
                  {creatorFound.is_active ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active &amp; Available
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      Disabled / Inactive
                    </span>
                  )}
                  {creatorFound.is_verified && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Verified
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatorFound(null);
                    setCreatorEmail('');
                    setCreatorError('');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer text-left sm:text-right"
                >
                  Change Creator
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Email</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">
                    {creatorFound.email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Institution</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block">
                    {creatorFound.institution || 'Individual Creator'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Phone</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">
                    {creatorFound.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Location</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block">
                    {[creatorFound.city, creatorFound.country].filter(Boolean).join(', ') || 'Global'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {creatorError && (
            <div className="p-3 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
              {creatorError}
            </div>
          )}
        </div>

        {/* LOCKED STATE: IF CREATOR NOT YET CHECKED / UNAVAILABLE */}
        {!isCreatorReady ? (
          <div className="p-6 rounded bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Step 2: Subscription Configuration Locked
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Enter the creator email address and click &quot;Check Availability&quot; above to verify the creator and unlock plan selection, duration, and pricing options.
            </div>
          </div>
        ) : (
          /* UNLOCKED STATE: SELECT OTHER DATA */
          <>
            {/* SECTION 2: PACKAGE PLAN SELECTION */}
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Package Plan Tier
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Package (Includes Public &amp; Custom Plans)
                  </label>
                  {loadingPackages ? (
                    <div className="text-xs text-slate-400 py-1.5 font-normal">Loading packages catalog...</div>
                  ) : (
                    <select
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 cursor-pointer"
                    >
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          #{pkg.id} - {pkg.name} {pkg.is_public === false ? '[Custom / Private]' : '[Public]'} &bull; ${Number(pkg.monthly_price_usd ?? pkg.monthly_price ?? 0).toFixed(2)}/mo
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {currentPackage && (
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {currentPackage.name}
                      </span>
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                          currentPackage.is_public === false
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {currentPackage.is_public === false ? 'Custom Tier' : 'Public Tier'}
                      </span>
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      USD: ${Number(currentPackage.monthly_price_usd ?? currentPackage.monthly_price ?? 0).toFixed(2)}/mo &bull; ${Number(currentPackage.yearly_price_usd ?? currentPackage.yearly_price ?? 0).toFixed(2)}/yr
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      BDT: ৳{Number(currentPackage.monthly_price_bdt ?? 0).toFixed(2)}/mo &bull; ৳{Number(currentPackage.yearly_price_bdt ?? 0).toFixed(2)}/yr
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      Grace Period: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{currentPackage.grace_period ?? 3} days</span> after expiration
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: DURATION & BILLING CYCLE */}
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                3. Subscription Duration &amp; Term
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Duration Term
                  </label>
                  <select
                    value={durationType}
                    onChange={(e) => setDurationType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800 cursor-pointer"
                  >
                    <option value="monthly">1 Month (Monthly)</option>
                    <option value="2_months">2 Months</option>
                    <option value="3_months">3 Months (Quarterly)</option>
                    <option value="6_months">6 Months (Half-Yearly)</option>
                    <option value="yearly">1 Year (Yearly)</option>
                    <option value="2_years">2 Years</option>
                    <option value="3_years">3 Years</option>
                    <option value="custom">Custom Multiplier...</option>
                  </select>
                </div>

                {durationType === 'custom' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customMultiplier}
                        onChange={(e) => setCustomMultiplier(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Unit
                      </label>
                      <select
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                      >
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Span</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">
                      {durationInfo.label}
                    </span>
                  </div>
                )}

                <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Calculated Period</span>
                  <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                    {durationInfo.startDate.toLocaleDateString()} &rarr; {durationInfo.endDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4: PAYMENT STATUS & PRICING */}
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                4. Payment Status &amp; Pricing
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Paid vs Unpaid Toggle */}
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    Payment State
                  </label>
                  <div className="space-y-1.5">
                    <label
                      className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        paymentStatus === 'PAID'
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status"
                        value="PAID"
                        checked={paymentStatus === 'PAID'}
                        onChange={() => setPaymentStatus('PAID')}
                        className="mt-0.5 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-semibold">Paid (Grant &amp; Activate Now)</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Creates completed purchase and successful payment receipt. Subscription starts immediately.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        paymentStatus === 'UNPAID'
                          ? 'bg-amber-50/70 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_status"
                        value="UNPAID"
                        checked={paymentStatus === 'UNPAID'}
                        onChange={() => setPaymentStatus('UNPAID')}
                        className="mt-0.5 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-semibold">Unpaid (Issue Invoice to Creator)</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Appears in creator panel with &quot;Pay Now&quot; checkout button. Activates after payment.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Currency and Amount */}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Currency
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrency('USD')}
                        className={`flex-1 py-1.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                          currency === 'USD'
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        USD ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency('BDT')}
                        className={`flex-1 py-1.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                          currency === 'BDT'
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        BDT (৳)
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Settlement Amount ({currency === 'BDT' ? '৳ BDT' : '$ USD'})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={`Suggested: ${autoPrice.toFixed(2)}`}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-800"
                      />
                      <div className="text-[10px] text-slate-400 mt-1">
                        Auto calculated from tier: {currency === 'BDT' ? '৳' : '$'}{autoPrice.toFixed(2)}. Leave empty or customize.
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Internal Memo / Notes
                    </label>
                    <textarea
                      rows={4}
                      placeholder="e.g. Granted by operations team for School Annual Contract."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || !isCreatorReady}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Processing Subscription...'
                  : paymentStatus === 'PAID'
                  ? 'Grant Paid Subscription'
                  : 'Issue Unpaid Invoice'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useCreator } from '../layout';
import {
  BiCube,
  BiCheckCircle,
  BiTimeFive,
  BiCreditCard,
  BiCheckShield,
  BiLoaderAlt,
  BiStar,
  BiCheck,
} from 'react-icons/bi';

export default function CreatorPurchasesPage() {
  const {
    creatorId,
    activeSubscription,
    subscriptions = [],
    packages = [],
    stats = {},
    refetch,
  } = useCreator();

  const [purchasingPkgId, setPurchasingPkgId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const daysRemaining = stats?.daysRemaining || 0;

  const handleSubscribe = async (pkg) => {
    setPurchasingPkgId(pkg.id);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase_subscription',
          creatorId: Number(creatorId),
          packageId: pkg.id,
          paymentMethod,
          provisionWebsite: false,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Successfully subscribed to ${pkg.name}! Duration is now active.`);
        await refetch();
      } else {
        setErrorMsg(json.error || 'Subscription purchase failed.');
      }
    } catch (err) {
      setErrorMsg('Network error while processing subscription.');
    } finally {
      setPurchasingPkgId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <BiCube className="text-slate-800 text-2xl" />
          <span>Packages & Subscription Duration</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your current active package, duration countdown, and explore available upgrade tiers.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <BiCheckCircle className="text-lg flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 tracking-wider">
                Current Subscription Plan
              </span>
              {activeSubscription && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Duration
                </span>
              )}
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {activeSubscription?.package_name || 'No Active Package'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {activeSubscription?.package_description ||
                  'Select an available package below to enable portfolio website creation and edge publishing.'}
              </p>
            </div>

            {activeSubscription && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <BiTimeFive className="text-secondary" />
                  <span>
                    Days Remaining:{' '}
                    <strong className="text-slate-900 font-mono">{daysRemaining} days</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BiCube className="text-slate-700" />
                  <span>
                    Allowed Websites:{' '}
                    <strong className="text-slate-900 font-mono">
                      {activeSubscription.max_websites ?? activeSubscription.max_portfolios ?? 1}{' '}
                      {(activeSubscription.max_websites ?? activeSubscription.max_portfolios ?? 1) === 1 ? 'website' : 'websites'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BiCreditCard className="text-slate-700" />
                  <span>
                    Billing Cycle:{' '}
                    <strong className="text-slate-900 capitalize">
                      {activeSubscription.billing_interval?.toLowerCase()}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 min-w-[220px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Subscription Schedule
            </span>
            <div className="text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Started:</span>
                <span className="font-mono text-slate-900">
                  {activeSubscription?.current_period_start
                    ? new Date(activeSubscription.current_period_start).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Renews / Ends:</span>
                <span className="font-mono text-secondary font-bold">
                  {activeSubscription?.current_period_end
                    ? new Date(activeSubscription.current_period_end).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Packages to Upgrade / Subscribe */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BiStar className="text-amber-500 text-xl" />
            <span>Available Packages & Durations</span>
          </h2>
          <p className="text-xs text-slate-500">
            Purchase any package to extend your duration or increase website limits.
          </p>
        </div>

        {/* Payment Method Selector */}
        <div className="flex items-center gap-3 py-1 text-xs">
          <span className="text-slate-600 font-semibold">Select Payment Method:</span>
          {['CARD', 'PAYPAL', 'CRYPTO'].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                paymentMethod === method
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const isCurrent = activeSubscription?.package_id === pkg.id;
            const price = (Number(pkg.price_in_cents || 0) / 100).toFixed(0);

            return (
              <div
                key={pkg.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all shadow-xs ${
                  isCurrent
                    ? 'bg-white border-slate-900 ring-2 ring-slate-900/10'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">{pkg.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">${price}</span>
                    <span className="text-xs text-slate-500">
                      / {pkg.billing_interval?.toLowerCase() || 'month'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">{pkg.description}</p>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <BiCheck className="text-emerald-600 text-base" />
                      <span>Host up to {pkg.max_websites ?? pkg.max_portfolios ?? 1} website(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BiCheck className="text-emerald-600 text-base" />
                      <span>Full Drag-and-Drop Canvas Studio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BiCheck className="text-emerald-600 text-base" />
                      <span>Custom Domain & Edge SSL Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BiCheck className="text-emerald-600 text-base" />
                      <span>Visitor Inquiries & Lead Management</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleSubscribe(pkg)}
                    disabled={purchasingPkgId === pkg.id}
                    className={`w-full py-2.5 rounded-full text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {purchasingPkgId === pkg.id ? (
                      <>
                        <BiLoaderAlt className="animate-spin text-base" />
                        <span>Processing {paymentMethod}...</span>
                      </>
                    ) : (
                      <span>{isCurrent ? 'Extend Duration (30 Days)' : `Purchase ${pkg.name}`}</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Subscriptions Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BiCheckShield className="text-emerald-600 text-lg" />
          <span>Subscription History</span>
        </h3>

        {subscriptions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No past subscription records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-[11px] font-semibold uppercase">
                  <th className="pb-3">Package</th>
                  <th className="pb-3">Interval</th>
                  <th className="pb-3">Period Start</th>
                  <th className="pb-3">Period End</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">{sub.package_name || 'Package'}</td>
                    <td className="py-3 text-slate-500">{sub.billing_interval || 'MONTHLY'}</td>
                    <td className="py-3 font-mono">
                      {new Date(sub.current_period_start).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-mono text-slate-900 font-semibold">
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

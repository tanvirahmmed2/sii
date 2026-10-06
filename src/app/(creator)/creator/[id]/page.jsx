'use client';

import Link from 'next/link';
import { useCreator } from './layout';

export default function CreatorOverviewPage() {
  const {
    creator,
    creatorId,
    activeSubscription,
    websites = [],
    payments = [],
    stats = {},
  } = useCreator();

  const daysRemaining = stats?.daysRemaining || 0;
  const hasActivePackage = stats?.hasActivePackage ?? Boolean(activeSubscription);
  const maxWebsites = stats?.maxWebsites || activeSubscription?.max_websites || activeSubscription?.max_portfolios || 1;

  const { spentUsd, spentBdt } = payments.reduce(
    (acc, p) => {
      if (['successful', 'completed'].includes(p.status?.toLowerCase())) {
        const amt = Number(p.amount || 0);
        const curr = (p.currency || (p.payment_method === 'BKASH' ? 'BDT' : 'USD')).toUpperCase();
        if (curr === 'BDT') {
          acc.spentBdt += amt;
        } else {
          acc.spentUsd += amt;
        }
      }
      return acc;
    },
    { spentUsd: 0, spentBdt: 0 }
  );

  const sections = [
    {
      title: 'My Websites',
      href: `/creator/${creatorId}/workspace`,
      badge: `${websites.length} of ${maxWebsites}`,
      description: 'Manage your portfolio websites, domain routing, and drag-and-drop studio.',
    },
    {
      title: 'My Subscription',
      href: `/creator/${creatorId}/subscription`,
      badge: hasActivePackage ? 'Active' : 'Expired / None',
      description: 'View current plan tier, quotas, renewal terms, and branding settings.',
    },
    {
      title: 'Packages & Plans',
      href: `/creator/${creatorId}/purchases`,
      badge: 'Billing Cycle',
      description: 'Review purchase history, renew active plan, or change package tiers.',
    },
    {
      title: 'Billing & Invoices',
      href: `/creator/${creatorId}/payments`,
      badge: 'Receipts',
      description: 'Review settled transactions, download printable invoices, and view receipts.',
    },
    {
      title: 'Support Tickets',
      href: `/creator/${creatorId}/tickets`,
      badge: 'Helpdesk',
      description: 'Submit technical inquiries, DNS assistance, and platform questions.',
    },
    {
      title: 'Client Reviews',
      href: `/creator/${creatorId}/reviews`,
      badge: 'Feedback',
      description: 'Manage testimonials, ratings, and public reviews for your portfolio sites.',
    },
    {
      title: 'Product Updates',
      href: `/creator/${creatorId}/updates`,
      badge: 'Changelog',
      description: 'Platform announcements, new features, and technical update notes.',
    },
    {
      title: 'Creator Profile',
      href: `/creator/${creatorId}/profile`,
      badge: 'Profile',
      description: 'Update your public creator bio, contact details, and organization name.',
    },
    {
      title: 'Security & 2FA',
      href: `/creator/${creatorId}/settings`,
      badge: 'Security',
      description: 'Manage login sessions, active devices, password changes, and 2FA authentication.',
    },
  ];

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500">
              Workspace Overview
            </span>
            <span className="text-[10px] text-slate-400 font-mono">ID #{creatorId}</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900">
            Welcome back, {creator?.name || 'Creator'}
          </h1>
          <p className="text-slate-500 text-xs">
            Overview of your websites, subscription status, and platform services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/creator/${creatorId}/purchases`}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            Manage Subscription
          </Link>
          <Link
            href={`/creator/${creatorId}/workspace`}
            className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            Websites
          </Link>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Current Plan
          </span>
          <div className="font-semibold text-slate-900 text-sm truncate">
            {activeSubscription?.package_name || 'No Active Plan'}
          </div>
          <span className="text-[10px] text-slate-500">
            {hasActivePackage ? 'Active Duration' : 'Subscription Required'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Websites Hosted
          </span>
          <div className="font-semibold text-slate-900 text-sm font-mono">
            {websites.length} / {maxWebsites}
          </div>
          <span className="text-[10px] text-slate-500">
            {maxWebsites - websites.length} slot(s) available
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Days Remaining
          </span>
          <div className="font-semibold text-slate-900 text-sm font-mono">
            {daysRemaining} Days
          </div>
          <span className="text-[10px] text-slate-500">
            {activeSubscription?.current_period_end
              ? `Ends ${new Date(activeSubscription.current_period_end).toLocaleDateString()}`
              : 'N/A'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Total Spent
          </span>
          {spentUsd > 0 && spentBdt > 0 ? (
            <div className="font-semibold text-slate-900 text-sm font-mono space-y-0.5">
              <div>${spentUsd.toFixed(2)} USD</div>
              <div className="text-xs text-slate-600 font-medium">৳{spentBdt.toLocaleString()} BDT</div>
            </div>
          ) : spentBdt > 0 ? (
            <div className="font-semibold text-slate-900 text-sm font-mono">
              ৳{spentBdt.toLocaleString()} BDT
            </div>
          ) : (
            <div className="font-semibold text-slate-900 text-sm font-mono">
              ${spentUsd.toFixed(2)} USD
            </div>
          )}
          <span className="text-[10px] text-slate-500">Settled invoices</span>
        </div>
      </div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className="bg-white border border-slate-200 rounded p-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-2 group"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 text-xs group-hover:text-slate-700">
                  {s.title}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-slate-50 text-slate-600 border-slate-200">
                  {s.badge}
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-normal">{s.description}</p>
            </div>
            <div className="text-[11px] font-medium text-slate-800 text-right pt-1 border-t border-slate-100">
              Open &rarr;
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

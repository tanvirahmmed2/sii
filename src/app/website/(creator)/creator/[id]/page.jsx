'use client';

import Link from 'next/link';
import { useCreator } from './layout';
import {
  BiFolder,
  BiFolderOpen,
  BiDesktop,
  BiBriefcase,
  BiCheckShield,
  BiCube,
  BiCreditCard,
  BiHeadphone,
  BiStar,
  BiBell,
  BiUser,
  BiCog,
  BiRightArrowAlt,
  BiErrorCircle,
  BiCheckCircle,
  BiTimeFive,
  BiPlus,
} from 'react-icons/bi';

export default function CreatorOverviewPage() {
  const {
    creator,
    creatorId,
    activeSubscription,
    pendingSubscription,
    websites = [],
    stats = {},
  } = useCreator();

  const daysRemaining = stats?.daysRemaining || 0;
  const hasActivePackage = stats?.hasActivePackage ?? Boolean(activeSubscription);
  const maxWebsites = stats?.maxWebsites || activeSubscription?.max_websites || activeSubscription?.max_portfolios || 1;

  // Folder link cards representing each module of the creator panel
  const folderCards = [
    {
      title: 'My Websites',
      href: `/creator/${creatorId}/webites`,
      icon: BiDesktop,
      badge: `${websites.length} ${websites.length === 1 ? 'Site' : 'Sites'}`,
      badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Manage your portfolio websites, domain routing, and drag-and-drop studio.',
      accent: 'emerald',
    },
    {
      title: 'Custom Projects',
      href: `/creator/${creatorId}/projects`,
      icon: BiBriefcase,
      badge: 'Bespoke Dev',
      badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Bespoke feature requests, quotes, working progress status, and live developer chat.',
      accent: 'indigo',
    },
    {
      title: 'My Subscription',
      href: `/creator/${creatorId}/subscription`,
      icon: BiCheckShield,
      badge: hasActivePackage ? 'Active Plan' : 'Unpaid',
      badgeStyle: hasActivePackage
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'View your subscription tier, billing period, quotas, and renewal terms.',
      accent: hasActivePackage ? 'emerald' : 'rose',
    },
    {
      title: 'Packages & Plans',
      href: `/creator/${creatorId}/purchases`,
      icon: BiCube,
      badge: 'Tier Plans',
      badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Explore available creator tiers, upgrade your package, or change billing intervals.',
      accent: 'blue',
    },
    {
      title: 'Billing & Invoices',
      href: `/creator/${creatorId}/payments`,
      icon: BiCreditCard,
      badge: 'Invoices',
      badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Review settled transactions, payment receipts, and billing history.',
      accent: 'slate',
    },
    {
      title: 'Support Tickets',
      href: `/creator/${creatorId}/tickets`,
      icon: BiHeadphone,
      badge: 'Helpdesk',
      badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Submit technical inquiries, DNS configuration help, and platform assistance.',
      accent: 'purple',
    },
    {
      title: 'Client Reviews',
      href: `/creator/${creatorId}/reviews`,
      icon: BiStar,
      badge: 'Testimonials',
      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Manage client reviews, satisfaction feedback, and showcase public ratings.',
      accent: 'amber',
    },
    {
      title: 'Product Updates',
      href: `/creator/${creatorId}/updates`,
      icon: BiBell,
      badge: 'Changelog',
      badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200',
      description: 'Discover new platform capabilities, changelog notes, and product announcements.',
      accent: 'teal',
    },
    {
      title: 'Creator Profile',
      href: `/creator/${creatorId}/profile`,
      icon: BiUser,
      badge: 'Identity',
      badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Update your public creator biography, brand name, and contact details.',
      accent: 'slate',
    },
    {
      title: 'Security & 2FA',
      href: `/creator/${creatorId}/settings`,
      icon: BiCog,
      badge: 'Credentials',
      badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Configure password security, account authentication, and two-factor protection.',
      accent: 'slate',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                Creator Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">ID #{creatorId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {creator?.name || 'Creator'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Access your workspace directories, manage portfolio websites, custom projects, and account settings.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Link
              href={`/creator/${creatorId}/purchases`}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors"
            >
              Plans & Packages
            </Link>
          </div>
        </div>
      </div>

      {/* 1. Unpaid or Pending Subscription Notice Card */}
      {pendingSubscription ? (
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <BiErrorCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-rose-900">
                    Unpaid / Pending Subscription Notice
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-800 border border-rose-300 uppercase">
                    {pendingSubscription.status || 'UNPAID'}
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed max-w-2xl">
                  You have an unpaid subscription order for the{' '}
                  <strong className="font-semibold text-rose-950">
                    {pendingSubscription.package_name || 'Creator'}
                  </strong>{' '}
                  package ($
                  {(Number(pendingSubscription.price_in_cents || 0) / 100).toFixed(2)}{' '}
                  {pendingSubscription.currency || 'USD'} /{' '}
                  {pendingSubscription.billing_interval || 'MONTHLY'}). Complete your payment to activate all portfolio builder features and custom domains.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <Link
                href={`/creator/${creatorId}/purchases`}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>Pay & Activate Plan</span>
                <BiRightArrowAlt className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : !hasActivePackage ? (
        <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <BiTimeFive className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-amber-900">
                    No Active Subscription
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-800 border border-amber-300 uppercase">
                    Inactive
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                  You do not currently have an active plan. Choose a package tier to provision unlimited portfolio websites, custom domain edge routing, and cloud storage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <Link
                href={`/creator/${creatorId}/purchases`}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>Browse Packages</span>
                <BiRightArrowAlt className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <BiCheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-emerald-950">
                    Active Subscription: {activeSubscription.package_name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800 border border-emerald-300 uppercase">
                    Active
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  {daysRemaining} day(s) remaining in current billing cycle (
                  {activeSubscription.billing_interval || 'MONTHLY'}). Hosted websites:{' '}
                  <strong>
                    {websites.length} / {maxWebsites}
                  </strong>{' '}
                  in your plan.
                </p>
              </div>
            </div>

            <Link
              href={`/creator/${creatorId}/subscription`}
              className="px-4 py-2 border border-emerald-300 hover:bg-emerald-100/70 text-emerald-900 rounded-2xl text-xs font-semibold transition-colors self-start md:self-center"
            >
              Subscription Details
            </Link>
          </div>
        </div>
      )}

      {/* 2. Folder Link Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BiFolder className="w-5 h-5 text-indigo-600" />
              <span>Workspace Folders</span>
            </h2>
            <p className="text-xs text-slate-500">
              Quick access directory cards for all creator modules, tools, and communications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folderCards.map((card, idx) => {
            const Icon = card.icon;

            return (
              <Link
                key={idx}
                href={card.href}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:border-slate-300 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Folder tab style & badge */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Folder
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${card.badgeStyle}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Footer Link arrow */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors flex items-center gap-1">
                    <BiFolderOpen className="w-3.5 h-3.5" />
                    <span>Open directory</span>
                  </span>
                  <BiRightArrowAlt className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

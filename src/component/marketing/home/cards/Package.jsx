'use client';

import React from 'react';
import Link from 'next/link';
import {
  BiCheckCircle,
  BiStar,
  BiGlobe,
  BiUser,
  BiGroup,
  BiCloud,
  BiTime,
  BiRightArrowAlt,
} from 'react-icons/bi';

export default function Package({
  pkg,
  price,
  billingCycle = 'MONTHLY',
  currency = 'USD',
}) {
  if (!pkg) return null;

  const symbol = currency === 'BDT' ? '৳' : '$';
  const isYearly = billingCycle === 'YEARLY';
  const isPopular = Boolean(pkg.is_popular ?? pkg.popular);

  const maxWebsites = Number(pkg.max_websites ?? pkg.maxWebsites ?? pkg.max_portfolios ?? pkg.maxPortfolios ?? 1);
  const maxStudents = Number(pkg.max_students ?? pkg.maxStudents ?? 500);
  const maxTeachers = Number(pkg.max_teachers ?? pkg.maxTeachers ?? 30);
  const maxStaff = Number(pkg.max_staff ?? pkg.maxStaff ?? 20);
  const maxStorageMb = Number(pkg.max_storage_mb ?? pkg.maxStorageMb ?? 5120);
  const trialDays = Number(pkg.trial_days ?? pkg.trialDays ?? 0);
  const discountPct = Number(pkg.discount_percentage ?? pkg.discountPercentage ?? 0);

  const storageDisplay =
    maxStorageMb >= 1024
      ? `${Math.round(maxStorageMb / 1024)} GB`
      : `${maxStorageMb} MB`;

  // Merge tenant modules and features for rich display
  const moduleNames = Array.isArray(pkg.tenant_modules) && pkg.tenant_modules.length > 0
    ? pkg.tenant_modules.map((m) => m.name || m.title || m)
    : Array.isArray(pkg.allowed_modules) && pkg.allowed_modules.length > 0
    ? pkg.allowed_modules
    : [];

  const rawFeatures = Array.isArray(pkg.features)
    ? pkg.features.map((f) => (typeof f === 'string' ? f : f.name || f.description || ''))
    : [];

  // Combine and deduplicate
  const combinedFeatures = Array.from(new Set([...moduleNames, ...rawFeatures])).filter(Boolean);
  const displayFeatures = combinedFeatures.length > 0
    ? combinedFeatures
    : ['Student Information Management', 'Attendance & Grade Tracking', 'Instant Subdomain Provisioning', '24/7 Creator Support Access'];

  return (
    <div
      className={`relative rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 select-text ${
        isPopular
          ? 'bg-white dark:bg-slate-900 border-2 border-secondary shadow-xl shadow-secondary/15 ring-2 ring-secondary/20 z-10'
          : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-secondary/40 dark:hover:border-secondary/40'
      }`}
    >
      {/* Most Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-secondary to-secondary-dark text-white text-[11px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5 z-20">
          <BiStar className="text-sm fill-current text-white" />
          <span>Most Popular</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Header info */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {pkg.name}
            </h3>
            {trialDays > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <BiTime className="text-xs" />
                <span>{trialDays}d Trial</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
            {pkg.tagline || pkg.description || 'Comprehensive institution management package.'}
          </p>
        </div>

        {/* Pricing Display */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {symbol}{Number(price).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isYearly ? '/ year' : '/ month'}
            </span>
            {isYearly && discountPct > 0 && (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold ml-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                SAVE {discountPct}%
              </span>
            )}
            {isYearly && discountPct === 0 && (
              <span className="text-[10px] text-secondary font-bold ml-1.5 bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-md">
                Annual Pass
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {isYearly ? 'Billed annually with full feature access' : 'Billed monthly, cancel anytime'}
          </p>
        </div>

        {/* Resource Quotas Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <BiGlobe className="text-base text-secondary shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {maxWebsites} {maxWebsites === 1 ? 'Website' : 'Websites'}
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <BiUser className="text-base text-secondary shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {maxStudents.toLocaleString()} Students
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <BiGroup className="text-base text-secondary shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {maxTeachers + maxStaff} Staff & Faculty
            </span>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <BiCloud className="text-base text-secondary shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {storageDisplay} Storage
            </span>
          </div>
        </div>

        {/* Included Features & Modules */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            What is included:
          </span>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            {displayFeatures.slice(0, 8).map((feat, fidx) => (
              <li key={fidx} className="flex items-start gap-2.5 leading-relaxed">
                <BiCheckCircle className="text-base text-primary dark:text-primary-light shrink-0 mt-0.5" />
                <span className="line-clamp-2">{feat}</span>
              </li>
            ))}
            {displayFeatures.length > 8 && (
              <li className="text-[11px] font-semibold text-secondary pt-0.5 pl-6">
                + {displayFeatures.length - 8} more modules & capabilities
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-7">
        <Link
          href={`/creator/checkout?packageId=${pkg.id}&currency=${currency}&interval=${billingCycle.toLowerCase()}`}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
            isPopular
              ? 'bg-secondary hover:bg-secondary-dark text-white shadow-secondary/25 ring-2 ring-secondary/30'
              : 'bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20 text-white border border-slate-800 dark:border-white/10 hover:border-secondary/40'
          }`}
        >
          <span>{pkg.cta || `Get ${pkg.name}`}</span>
          <BiRightArrowAlt className="text-base" />
        </Link>
      </div>
    </div>
  );
}
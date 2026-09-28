'use client';

import React from 'react';
import Link from 'next/link';
import { BiCheckCircle, BiStar, BiLayer } from 'react-icons/bi';

export default function Package({
  pkg,
  price,
  billingCycle = 'MONTHLY',
  currency = 'USD',
}) {
  if (!pkg) return null;

  const symbol = currency === 'BDT' ? '৳' : '$';
  const isYearly = billingCycle === 'YEARLY';
  const isPopular = Boolean(pkg.popular);

  return (
    <div
      className={`relative rounded-3xl p-7 sm:p-8 border flex flex-col justify-between transition-all duration-300 w-[300px] sm:w-[340px] md:w-[360px] shrink-0 snap-start select-text ${
        isPopular
          ? 'bg-white dark:bg-slate-900 border-secondary shadow-xl shadow-secondary/15 ring-2 ring-secondary/20'
          : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-secondary/40 dark:hover:border-secondary/40'
      }`}
    >
      {/* Most Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-secondary to-secondary-dark text-white text-[11px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1 z-10">
          <BiStar className="text-sm fill-current text-white" />
          <span>Most Popular</span>
        </div>
      )}

      <div className="space-y-6">
        {/* App Title & Package Name */}
        <div>
          {pkg.app_title && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-slate-800 dark:text-primary-light border border-primary/30">
                <BiLayer className="text-xs text-secondary" />
                <span>{pkg.app_title}</span>
              </span>
            </div>
          )}
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {pkg.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
            {pkg.description}
          </p>
        </div>

        {/* Pricing Display */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-4xl font-black text-slate-900 dark:text-white font-mono">
            {symbol}{Number(price).toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isYearly ? '/ year' : '/ month'}
          </span>
          {isYearly && (
            <span className="text-[10px] text-primary-dark dark:text-primary-light font-bold ml-1.5 bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-md">
              annual pass
            </span>
          )}
        </div>

        {/* Quota Badge */}
        <div className="text-xs text-secondary dark:text-secondary-light bg-secondary/10 px-3.5 py-1.5 rounded-xl border border-secondary/20 w-fit font-semibold">
          {pkg.maxWebsites ?? pkg.max_websites ?? pkg.maxPortfolios ?? pkg.max_portfolios ?? 1}{' '}
          {(pkg.maxWebsites ?? pkg.max_websites ?? pkg.maxPortfolios ?? pkg.max_portfolios ?? 1) === 1
            ? 'Website'
            : 'Websites'}{' '}
          Included
        </div>

        {/* Included Features & Modules */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            What is included:
          </span>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            {Array.isArray(pkg.features) &&
              pkg.features.map((feat, fidx) => (
                <li key={fidx} className="flex items-start gap-2.5 leading-relaxed">
                  <BiCheckCircle className="text-base text-primary dark:text-primary-light shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{feat}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-6">
        <Link
          href={`/creator/checkout?packageId=${pkg.id}&currency=${currency}&interval=${billingCycle.toLowerCase()}`}
          className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
            isPopular
              ? 'bg-secondary hover:bg-secondary-dark text-white shadow-secondary/25'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 hover:border-secondary/40 hover:text-secondary'
          }`}
        >
          <span>{pkg.cta || `Get ${pkg.name}`}</span>
          <span>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
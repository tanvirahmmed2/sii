'use client';

import React from 'react';
import Link from 'next/link';
import {
  BiCart,
  BiTrendingUp,
  BiRightArrowAlt,
  BiDollarCircle,
  BiBarChartAlt2,
  BiCheckShield,
  BiBarcode,
  BiLayout,
  BiCheck,
  BiShieldQuarter,
  BiCheckCircle,
} from 'react-icons/bi';

// 4 Core E-Commerce Capabilities
const COMMERCE_FEATURES = [
  {
    id: 'builder',
    title: 'Easy Drag & Drop Store Builder',
    tagline: 'Design, arrange, and publish high-converting storefronts visually without writing code.',
    icon: BiLayout,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
    capabilities: [
      'Modular drag-and-drop block library (hero banners, product grids, testimonials, FAQ)',
      'Automatic mobile, tablet, and desktop layout optimization with zero code',
      '1-click custom domain connection with automated 256-bit SSL encryption',
      'Instant edge CDN publishing with sub-0.34s global page load speeds',
    ],
  },
  {
    id: 'inventory',
    title: 'Digital Store & Inventory Management',
    tagline: 'Manage physical multi-variant SKUs, digital downloads, and instant cloud fulfillment automatically.',
    icon: BiBarcode,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
    capabilities: [
      'Multi-variant SKU tracking across sizes, colors, bundles, and multiple warehouses',
      'Instant encrypted cloud download delivery right after customer payment clears',
      'Automated license key, serial code, and digital asset vault distribution',
      'Automated low-stock notifications and checkout inventory reservation locks',
    ],
  },
  {
    id: 'cart_order',
    title: 'Dynamic User Control: Cart & Orders',
    tagline: 'Interactive cart drawers, express checkout, and end-to-end automated order tracking.',
    icon: BiCart,
    iconBg: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
    capabilities: [
      'Fluid slide-out cart drawer with real-time quantity adjustments and promo vouchers',
      '1-click frictionless express checkout with Apple Pay, Google Pay, and Stripe',
      'Automated branded PDF invoices and tax receipts generated on every order',
      'Live courier shipping tracking (DHL, FedEx, UPS) with self-serve buyer portal',
    ],
  },
  {
    id: 'sales_cost',
    title: 'Sales & Cost Management',
    tagline: 'Track real-time gross revenue, product COGS, net profit margins, and daily bank payouts.',
    icon: BiDollarCircle,
    iconBg: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    capabilities: [
      'Real-time net profit calculation deducting supplier product costs, packaging, and shipping',
      'Cost of Goods Sold (COGS) tracker per SKU to protect your bottom-line profit margins',
      '0% platform cuts — keep 100% of your earnings with zero transaction penalties',
      'Direct Stripe rails daily deposits straight into your connected bank account',
    ],
  },
];

export default function Ecommerce() {
  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-20">
        {/* Section Heading */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Turn your website into a high-growth online commerce powerhouse
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            From drag-and-drop storefront creation to automated digital &amp; physical inventory, dynamic cart controls, and comprehensive sales &amp; cost tracking — everything you need to build a profitable store.
          </p>
        </div>

      
        {/* 4 Core Features Grid: Drag & Drop Builder, Inventory, Cart/Order, Sales/Cost */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COMMERCE_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="rounded-3xl p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-600 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs ${feat.iconBg}`}>
                    <Icon />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.tagline}
                  </p>
                </div>

                {/* Checklist */}
                <div className="space-y-2 pt-3 border-t border-slate-200/70 dark:border-slate-700/60">
                  {feat.capabilities.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <BiCheck className="text-emerald-500 shrink-0 text-base mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust points and CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <BiCheckCircle className="text-emerald-500 text-base shrink-0" />
              <span>Automated PDF invoice generation &amp; branded receipts</span>
            </div>
            <div className="flex items-center gap-2">
              <BiCheckCircle className="text-emerald-500 text-base shrink-0" />
              <span>Built-in tax collection &amp; multi-currency conversion</span>
            </div>
            <div className="flex items-center gap-2">
              <BiCheckCircle className="text-emerald-500 text-base shrink-0" />
              <span>Instant direct payouts via Stripe to your bank account</span>
            </div>
          </div>

          <Link
            href="/packages"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <span>Launch Your Online Store</span>
            <BiRightArrowAlt className="text-base" />
          </Link>
        </div>

        {/* Marketplaces vs Your Store Comparison Banner */}
        <div className="rounded-3xl p-6 sm:p-8 bg-primary-dark text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-900/40">
          <div className="space-y-2 text-center md:text-left">
            
            <h3 className="text-xl sm:text-2xl font-bold">Keep 100% of Your Earnings &amp; Customer Data</h3>
            <p className="text-xs text-emerald-200 max-w-xl leading-relaxed">
              Third-party marketplaces take 30% cuts and hide your buyers&apos; emails. With your native online store, you own the relationship, enjoy instant payouts, and build lasting enterprise value.
            </p>
          </div>

          <Link
            href="/packages"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-900 hover:bg-emerald-50 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <span>Start Selling Today</span>
            <BiRightArrowAlt className="text-base" />
          </Link>
        </div>
      </div>
    </section>
  );
}
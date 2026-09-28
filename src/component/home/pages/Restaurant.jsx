'use client';

import React from 'react';
import Link from 'next/link';
import {
  BiRestaurant,
  BiFoodMenu,
  BiTable,
  BiGroup,
  BiDish,
  BiStar,
  BiRightArrowAlt,
  BiQrScan,
} from 'react-icons/bi';

export default function Restaurant() {
  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-16">
        {/* Section Heading */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Complete digital operating engine for restaurants, cafes &amp; dining
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Streamline your front-of-house hospitality and back-of-house kitchen operations with responsive QR digital menus, smart table management, staff sales tracking, live kitchen stock, and verified guest reviews.
          </p>
        </div>

        {/* 5 Core Restaurant Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Digital Responsive Menu */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
              <BiFoodMenu />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Digital Responsive Stylish Menu
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Mobile-first QR digital menus with high-resolution food photography, instant price and daily specials updates with zero reprint costs, and live dietary filtering for Vegan, Gluten-Free, and Halal diners.
            </p>
          </div>

          {/* 2. Order & Table Management */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
              <BiTable />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Order &amp; Table Management
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Interactive visual floor map showing real-time table statuses (Available, Seated, Ordering, Billed), seamless 1-click split checks by seat or item, and direct ticket routing to Kitchen Display Systems.
            </p>
          </div>

          {/* 3. Staff & Sales Management */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl">
              <BiGroup />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Staff &amp; Sales Management
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Role-based server PIN clock-in, automated transparent tip pooling, server sales leaderboards tracking beverage and dessert attachments, and fast closing register reconciliation audits.
            </p>
          </div>

          {/* 4. Live Kitchen Stock */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl">
              <BiDish />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Live Kitchen Stock &amp; 86’d Dishes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Recipe-level ingredient depletion linked to every order placed. Sold-out dishes automatically 86 and gray out on customer QR menus in real time to prevent line cooks from running out mid-service.
            </p>
          </div>

          {/* 5. Reviews & Reputation */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl">
              <BiStar />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Customer Reviews &amp; Feedback
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Automated 1-tap dining rating captured directly on digital checkout receipts, prompt routing 5-star diners to Google Maps and TripAdvisor, and instant table-side alerts to floor managers.
            </p>
          </div>

          {/* 6. Contactless Payments & Direct Payouts */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
              <BiQrScan />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Contactless Pay &amp; Zero Hardware Leases
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Accept Apple Pay, Google Pay, and credit cards directly at the table on any smartphone or tablet. Say goodbye to expensive proprietary POS hardware leases and long lock-in contracts.
            </p>
          </div>
        </div>


        {/* Restaurant Operations Trust Banner & CTA */}
        <div className="rounded-3xl p-6 sm:p-8 bg-secondary-dark text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-900/40">
          <div className="space-y-2 text-center md:text-left">
            
            <h3 className="text-xl sm:text-2xl font-bold">Empower Your Dining Room &amp; Line Cooks</h3>
            <p className="text-xs text-amber-200 max-w-xl leading-relaxed">
              Run your entire restaurant from stylish digital menus to live kitchen stock and split-billing from any tablet, phone, or browser without hardware lock-in.
            </p>
          </div>

          <Link
            href="/packages"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-900 hover:bg-amber-50 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <span>Launch Your Restaurant System</span>
            <BiRightArrowAlt className="text-base" />
          </Link>
        </div>
      </div>
    </section>
  );
}

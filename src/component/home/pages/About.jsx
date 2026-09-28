'use client';

import React from 'react';
import {
  BiCube,
  BiPalette,
  BiGroup,
  BiStar,
  BiRightArrowAlt,
} from 'react-icons/bi';
import Link from 'next/link';

export const data = [
  { id: 1, title: 'Ready UI Components', number: '110+', icon: BiCube, accent: 'from-blue-500 to-indigo-600' },
  { id: 2, title: 'Responsive Themes', number: '56+', icon: BiPalette, accent: 'from-purple-500 to-pink-600' },
  { id: 3, title: 'Active Creators', number: '23,000+', icon: BiGroup, accent: 'from-amber-500 to-orange-600' },
  { id: 4, title: 'Verified Reviews', number: '950+', icon: BiStar, accent: 'from-emerald-500 to-teal-600' },
];

export default function About() {
  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Simplifying your website building experience with ready-to-use, customizable tools
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Whether you are launching your first portfolio, scaling an agency, or running a direct-to-consumer store, our platform gives you the visual freedom and business backend to succeed without technical debt.
          </p>
        </div>

        {/* 4 Stats Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {data.map((item) => {
            const Icon = item.icon || BiCube;
            return (
              <div
                key={item.id}
                className="group relative rounded-3xl p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-linear-to-br ${item.accent} text-white flex items-center justify-center text-2xl shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight font-mono">
                  {item.number}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
                  {item.title}
                </div>
              </div>
            );
          })}
        </div>

        
        <div className="text-center pt-2">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-md"
          >
            <span>Learn More</span>
            <BiRightArrowAlt className="text-base" />
          </Link>
        </div>
      </div>
    </section>
  );
}
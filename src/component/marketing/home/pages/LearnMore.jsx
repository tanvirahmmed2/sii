'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BiLayer,
  BiDevices,
  BiCheckCircle,
  BiRightArrowAlt,
  BiMove,
} from 'react-icons/bi';
import { DiDatabase } from 'react-icons/di';
import { CgIfDesign } from 'react-icons/cg';

export default function LearnMore() {
  const [activeTab, setActiveTab] = useState('canvas');

  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-12">
        {/* Section Heading */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Drag &amp; drop tool to build pages instantly with live preview
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            No convoluted code or complicated deployments. Design every pixel with instantaneous preview feedback, backed by robust cloud infrastructure.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl">
              <CgIfDesign />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Design With Full Control</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Fine-tune typography, colors, padding, borders, and animations without writing CSS. Total creative liberty.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
              <BiLayer />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pre-Built Block Library</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Accelerate your workflow with 110+ production-tested blocks: hero headers, pricing grids, testimonials, and FAQs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
              <DiDatabase className="text-3xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Frontend to Backend Bridged</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Contact forms, leads, live chat, and checkout seamlessly save straight into your structured PostgreSQL database.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
              <BiDevices />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Multi-Device Breakpoints</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Preview and adjust responsiveness across desktop, tablet, and mobile displays with one click.
            </p>
          </div>
        </div>

     

        {/* CTA Footer */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-slate-900 font-bold text-xs shadow-md transition-all"
          >
            <span>Learn More About Architecture</span>
            <BiRightArrowAlt className="text-base" />
          </Link>
          <Link
            href="/creator/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-bold text-xs shadow-md transition-all"
          >
            <span>Try the Studio</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
'use client';

import React from 'react';
import {
  BiAward,
  BiBuildings,
  BiCheckShield,
  BiGlobe,
  BiBookOpen,
} from 'react-icons/bi';

export default function Partners() {
  const partners = [
    { name: 'Cambridge Academic Alliance', icon: BiAward },
    { name: 'Global EdTech Consortium', icon: BiGlobe },
    { name: 'Metropolitan Cadet Academy', icon: BiBuildings },
    { name: 'Chartered Institute of Scholars', icon: BiBookOpen },
    { name: 'Enterprise Cloud Trust', icon: BiCheckShield },
  ];

  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
      <div className="w-full max-w-7xl mx-auto space-y-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Trusted by Premier Educational Institutions &amp; Modern Businesses
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
          {partners.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Icon className="text-2xl text-primary" />
                <span className="text-sm font-semibold tracking-tight">{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

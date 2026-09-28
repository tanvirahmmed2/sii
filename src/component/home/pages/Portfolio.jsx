'use client';

import React from 'react';
import Link from 'next/link';
import {
  BiBriefcase,
  BiAward,
  BiBookOpen,
  BiCalendarCheck,
  BiCheck,
  BiRightArrowAlt,
} from 'react-icons/bi';

// 3 Core Capabilities of the Portfolio Builder
const PORTFOLIO_FEATURES = [
  {
    id: 'skills_experience',
    title: 'Digital Showcase of Skills & Experience',
    tagline: 'Highlight verified technical capabilities, career milestones, and client case studies with proof of work.',
    icon: BiAward,
    iconBg: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
    capabilities: [
      'Categorized skills matrix with proficiency levels and tech stack tags',
      'Interactive career milestone timeline with measurable business impact',
      'Metrics-driven case studies with before/after project results',
      'Verified client testimonials, endorsements, and external credentials',
    ],
  },
  {
    id: 'blogs_contributions',
    title: 'Dynamic Blogs & Contribution Engine',
    tagline: 'Publish high-ranking technical essays, case journals, and live open-source contributions.',
    icon: BiBookOpen,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
    capabilities: [
      'Native markdown and rich-text publishing suite with syntax highlighting',
      'Automated SEO schema markup, meta tags, and canonical URLs for Google',
      'Live GitHub open-source activity sync, repository stars, and commit feeds',
      'Built-in newsletter subscriber capture forms under every article',
    ],
  },
  {
    id: 'appointments',
    title: 'Native Appointment & Booking System',
    tagline: 'Let prospective clients, recruiters, and collaborators book paid consultations directly.',
    icon: BiCalendarCheck,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
    capabilities: [
      'Automatic visitor timezone detection with localized booking slots',
      'Upfront consultation retainer deposit collection via Stripe',
      'Custom project intake questionnaire to qualify client scope before calls',
      'Two-way calendar sync with Google & Outlook plus auto Zoom/Meet links',
    ],
  },
];

export default function Portfolio() {
  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-12">
        {/* Section Heading */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
       

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Turn your professional presence into a client-attracting powerhouse
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Whether you are a developer, consultant, creative studio, or executive — showcase your verified skills &amp; experience, publish dynamic blogs and contributions, and let clients schedule paid appointments effortlessly.
          </p>
        </div>

        {/* 3 Core Portfolio Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PORTFOLIO_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs ${feat.iconBg}`}>
                    <Icon />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.tagline}
                  </p>
                </div>

                {/* Clean Capability Checklist */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {feat.capabilities.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <BiCheck className="text-purple-500 shrink-0 text-base mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="text-center pt-4">
          <Link
            href="/creator/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-lg transition-all"
          >
            <span>Start Building Your Portfolio</span>
            <BiRightArrowAlt className="text-base" />
          </Link>
        </div>
      </div>
    </section>
  );
}
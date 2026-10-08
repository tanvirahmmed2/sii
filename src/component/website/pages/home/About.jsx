'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const About = () => {
  const { website, websiteSettings, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;

  return (
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Institutional Legacy
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Commitment to Character, Scholarship &amp; Community
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Founded on the pillars of holistic growth, scholarship, and integrity, {schoolName} is dedicated to preparing students for global career success through rigorous academics and progressive teaching methods.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              01 &bull; Academic Infrastructure
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Smart Classrooms &amp; Laboratories
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Digital multimedia connectivity, comprehensive STEM experimental laboratories, and modern learning aids supporting student engagement.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              02 &bull; Research &amp; Innovation
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Library &amp; Computing Resources
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              High-speed internet laboratories, curated research archives, and specialized literature supporting exploratory curiosity.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              03 &bull; Recognized Standards
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Board Accreditation &amp; Standing
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Fully approved curriculum recognized across regional examination boards, guaranteeing seamless credit transfer and credentials.
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href={tenantUrl('/about')}
            className="inline-flex items-center px-4 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Learn More About Our Campus &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
};

export default About;
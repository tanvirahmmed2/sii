'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Admission = () => {
  const { website, websiteSettings, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;

  return (
    <section className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Admissions Enrollment
          </span>

          <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Begin Your Educational Journey With {schoolName}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Applications for regular terms and specialized academic programs are evaluated transparently. Submit admission forms online or verify pre-registered student codes directly with the admissions registry.
          </p>

          <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              Verified Merit Evaluation
            </span>
            <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              Automated Section Placement
            </span>
            <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              Digital Payment &amp; Invoicing
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href={tenantUrl('/apply')}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium text-center transition-colors"
          >
            Apply Online &rarr;
          </Link>
          <Link
            href={tenantUrl('/admission')}
            className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-center transition-colors"
          >
            Admission Circulars
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Admission;
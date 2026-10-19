'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Admission = () => {
  const { website, websiteSettings, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;

  return (
    <section className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-6xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300"
      >
        <div className="space-y-3.5 max-w-2xl">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
            Admissions Enrollment
          </span>

          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Begin Your Educational Journey With {schoolName}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Applications for regular terms and specialized academic programs are evaluated transparently. Submit admission forms online or verify pre-registered student codes directly with the admissions registry.
          </p>

          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <span className="px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
              Verified Merit Evaluation
            </span>
            <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
              Automated Section Placement
            </span>
            <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
              Digital Payment &amp; Invoicing
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/admission/apply')}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-primary/20 transition-all duration-300 text-center cursor-pointer w-full sm:w-auto"
            >
              Apply Online &rarr;
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/admission')}
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-primary hover:text-primary rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-xs text-center cursor-pointer w-full sm:w-auto"
            >
              Admission Circulars
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Admission;
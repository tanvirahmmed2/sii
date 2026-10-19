'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const AdmissionCircularCard = ({ circular }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!circular) return null;

  const { id, title, class_name, finish_date, min_age, max_age, fees, monthly_fee } = circular;
  const applyUrl = tenantUrl(`/apply?admission_id=${id}`);

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors duration-200 h-full"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Class: {class_name}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {fees !== undefined && fees !== null && (
              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                Admission: ৳{parseFloat(fees).toFixed(2)}
              </span>
            )}
            {monthly_fee !== undefined && monthly_fee !== null && parseFloat(monthly_fee) > 0 && (
              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Monthly: ৳{parseFloat(monthly_fee).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
          {title}
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
              Deadline
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {finish_date ? new Date(finish_date).toLocaleDateString() : 'Open'}
            </span>
          </div>

          {(min_age !== null || max_age !== null) && (
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                Age Range
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {min_age || 0} &ndash; {max_age || '∞'} yrs
              </span>
            </div>
          )}
        </div>
      </div>

      <Link
        href={applyUrl}
        className="w-full text-center py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-primary/20 transition-all duration-200"
      >
        Apply for Admission &rarr;
      </Link>
    </motion.div>
  );
};

export default AdmissionCircularCard;

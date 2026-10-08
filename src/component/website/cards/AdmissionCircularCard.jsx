'use client';

import React from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const AdmissionCircularCard = ({ circular }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!circular) return null;

  const { id, title, class_name, finish_date, min_age, max_age, fees, monthly_fee } = circular;
  const applyUrl = tenantUrl(`/apply?admission_id=${id}`);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between gap-3 transition-colors">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Class: {class_name}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {fees !== undefined && fees !== null && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                Admission: ৳{parseFloat(fees).toFixed(2)}
              </span>
            )}
            {monthly_fee !== undefined && monthly_fee !== null && parseFloat(monthly_fee) > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Monthly: ৳{parseFloat(monthly_fee).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
          {title}
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
              Deadline
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {finish_date ? new Date(finish_date).toLocaleDateString() : 'Open'}
            </span>
          </div>

          {(min_age !== null || max_age !== null) && (
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                Age Range
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {min_age || 0} &ndash; {max_age || '∞'} yrs
              </span>
            </div>
          )}
        </div>
      </div>

      <Link
        href={applyUrl}
        className="w-full text-center py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded text-xs font-medium transition-colors"
      >
        Apply for Admission &rarr;
      </Link>
    </div>
  );
};

export default AdmissionCircularCard;

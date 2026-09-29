'use client';

import React from 'react';
import Link from 'next/link';
import { FiLayers, FiClock, FiCalendar, FiArrowRight } from 'react-icons/fi';

const AdmissionCircularCard = ({ circular }) => {
  if (!circular) return null;

  const { id, title, class_name, finish_date, min_age, max_age, fees, monthly_fee } = circular;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-primary-light transition-all flex flex-col justify-between gap-5 group">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary bg-primary-light px-3 py-1 rounded-full">
            <FiLayers className="text-xs" /> Class: {class_name}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {fees !== undefined && fees !== null && (
              <span className="text-xs font-semibold text-tertiary bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/50">
                Admission Fee: BDT {parseFloat(fees).toFixed(2)}
              </span>
            )}
            {monthly_fee !== undefined && monthly_fee !== null && parseFloat(monthly_fee) > 0 && (
              <span className="text-xs font-semibold text-primary bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                Monthly Fee: BDT {parseFloat(monthly_fee).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold text-primary leading-snug group-hover:text-tertiary transition-colors mt-1">
          {title}
        </h3>

        <div className="flex flex-col gap-2 text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100/80">
          <div className="flex items-center gap-2">
            <FiClock className="text-slate-400 shrink-0" />
            <span>Deadline: <strong className="text-slate-700 font-semibold">{new Date(finish_date).toLocaleDateString()}</strong></span>
          </div>

          {(min_age !== null || max_age !== null) && (
            <div className="flex items-center gap-2">
              <FiCalendar className="text-slate-400 shrink-0" />
              <span>Age Limits: <strong className="text-slate-700 font-semibold">{min_age || 0} to {max_age || '∞'} years</strong></span>
            </div>
          )}
        </div>
      </div>

      <Link
        href={`/admission/apply?admission_id=${id}`}
        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold tracking-wide transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs group-hover:bg-primary"
      >
        <span>Apply Online</span>
        <FiArrowRight className="text-sm transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
};

export default AdmissionCircularCard;

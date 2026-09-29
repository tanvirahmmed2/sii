'use client';

import React from 'react';
import Link from 'next/link';
import { FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { SCHOOL_NAME } from '@/lib/secret';

const Admission = () => {
  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
      <div className="w-full">
        <div className="bg-linear-to-br from-primary to-primary-light text-white rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.1),transparent_35%)]" />
          
          <div className="max-w-xl z-10 flex flex-col gap-4">
            
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
              Begin Your Educational Journey With  {SCHOOL_NAME.split(" ").map((w)=>w[0]).join('')} Today
            </h2>
            <p className="text-secondary text-xs md:text-sm leading-relaxed">
              If your academic registration code has been pre-created by the FIT campus registrar, you can finalize your profile details and complete registration setup online.
            </p>
            
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2 text-xs  text-secondary">
                <FiCheckCircle className="text-emerald-400" />
                <span>Auto-allocation of classroom subjects and sections</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary">
                <FiCheckCircle className="text-emerald-400" />
                <span>Hostel allocation validation (Male/Female designated rooms)</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 z-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto justify-center">
            <Link
              href="/auth/student/registration"
              className="inline-flex items-center justify-center gap-2 bg-tertiary hover:bg-primary-dark text-secondary font-bold px-6 py-3 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <span>Complete Setup</span>
              <FiArrowRight />
            </Link>
            <Link
              href="/admission"
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-3 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Admissions Info</span>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Admission;
'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';
import GradingScaleTable from 'src/component/website/cards/GradingScaleTable';

const ApplyPage = () => {
  const { website, websiteSettings, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;

  const steps = [
    {
      step: '01',
      title: 'Digital Application Entry',
      description: 'Fill out the online student profile with personal information, guardian details, and target grade choice.',
    },
    {
      step: '02',
      title: 'Credential Verification',
      description: 'Submit prior institutional transcripts, certificate photocopies, and valid identification cards.',
    },
    {
      step: '03',
      title: 'Settlement of Application Fees',
      description: 'Complete registration dues through official campus counters or secure digital billing gateways.',
    },
    {
      step: '04',
      title: 'Admissions Decision & Portal Setup',
      description: 'Receive admissions acceptance clearance and student credentials to sign into the campus student portal.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Student Enrollment
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Admissions Guide &amp; Application Steps &bull; {schoolName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Review enrollment criteria, mandatory documents, and proceed to the application form.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => (
          <div
            key={step.step}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                Stage {step.step}
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                Required
              </span>
            </div>
            <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
              {step.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
            Ready to Begin Registration?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            View active intake circulars or file a digital enrollment form directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={tenantUrl('/admission')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Open Application Forms &rarr;
          </Link>
        </div>
      </div>

      <GradingScaleTable
        title="Applicant Evaluation Standards"
        subtitle="Official letter grades, mark range thresholds (%), and GPA points utilized for applicant assessment."
      />
    </div>
  );
};

export default ApplyPage;

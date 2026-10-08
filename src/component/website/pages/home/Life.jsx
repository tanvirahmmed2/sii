'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Life = () => {
  const { website, websiteSettings, tenantUrl } = useContext(TenantWebsiteContext);
  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;

  return (
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Campus Experience
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Student Life at {schoolName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Education extends far beyond lectures. We cultivate dynamic environments for student co-curriculars, intellectual debate, athletics, and residential community life.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                Extracurricular
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Student Activity Clubs
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Join computing guilds, science forums, debate societies, art circles, and environmental committees to build leadership skills.
              </p>
            </div>
            <Link
              href={tenantUrl('/clubs')}
              className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:underline pt-2 border-t border-slate-200/80 dark:border-slate-700"
            >
              Explore Active Clubs &rarr;
            </Link>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                Residential
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Residential Halls &amp; Hostels
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Secure, gender-segregated campus residences with quiet study spaces, reliable utility backup, meal services, and faculty provost oversight.
              </p>
            </div>
            <Link
              href={tenantUrl('/facilities')}
              className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:underline pt-2 border-t border-slate-200/80 dark:border-slate-700"
            >
              View Living Accommodations &rarr;
            </Link>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                Athletics
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Athletics &amp; Wellness
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Competitive inter-school sports leagues, physical education programs, gymnasiums, and outdoor courts promoting healthy physical wellness.
              </p>
            </div>
            <Link
              href={tenantUrl('/events')}
              className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:underline pt-2 border-t border-slate-200/80 dark:border-slate-700"
            >
              View Sports &amp; Activities &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Life;
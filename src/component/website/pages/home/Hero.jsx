'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { SCHOOL_NAME } from 'src/lib/database/secret';

const Hero = () => {
  const { website, websiteSettings, tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
  });

  const schoolName = website?.name || websiteSettings?.school_name || SCHOOL_NAME;
  const eiin = website?.eiin_number || websiteSettings?.eiin || null;
  const institutionType = website?.institution_type || 'Educational Institution';
  const motto =
    websiteSettings?.motto ||
    'Dedicated to academic excellence, leadership development, and character building.';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await fetch(getApiEndpoint('public/stats'));
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const payload = statsData.payload || statsData.paylod;
          if (statsData.success && payload) {
            setStats({
              totalStudents: payload.totalStudents || 0,
              totalTeachers: payload.totalTeachers || 0,
              totalClasses: payload.totalClasses || 0,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching public stats in Hero:', err);
      }
    };

    fetchStats();
  }, [getApiEndpoint]);

  return (
    <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 flex flex-col items-center text-center space-y-6">
        {/* Meta badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {institutionType}
          </span>
          {eiin && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Govt. EIIN: {eiin}
            </span>
          )}
        </div>

        {/* Institution Headline */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight max-w-4xl leading-tight">
          {schoolName}
        </h1>

        {/* Institution Motto / Subtitle */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-normal">
          {motto}
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <Link
            href={tenantUrl('/apply')}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
          >
            Apply for Admission
          </Link>
          <Link
            href={tenantUrl('/auth/student')}
            className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Student Portal
          </Link>
          <Link
            href={tenantUrl('/notices')}
            className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Notice Board
          </Link>
        </div>

        {/* High-Density Statistical KPI Strip */}
        <div className="w-full max-w-4xl pt-8 sm:pt-10 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Enrolled Students
            </span>
            <p className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {stats.totalStudents ? stats.totalStudents.toLocaleString() : '0'}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Active Academic Cohort
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Faculty Members
            </span>
            <p className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {stats.totalTeachers ? stats.totalTeachers.toLocaleString() : '0'}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Dedicated Instructors
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Class Programs
            </span>
            <p className="font-mono text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {stats.totalClasses ? stats.totalClasses.toLocaleString() : '0'}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Academic Curriculums
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
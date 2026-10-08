'use client';

import React, { useState, useEffect, useContext } from 'react';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const PublicMonthlyFeesPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicFees = async () => {
      try {
        const res = await fetch(getApiEndpoint('public/monthly-fees'));
        const data = await res.json();
        if (res.ok && data.success) {
          setFees(data.payload?.monthlyFees || data.paylod?.monthlyFees || []);
        }
      } catch (err) {
        console.error('Failed to retrieve fee info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicFees();
  }, [getApiEndpoint]);

  const academicLevels = [
    {
      title: 'Primary Section (Grades 1 &ndash; 5)',
      description: 'Focuses on building core language skills, foundational mathematics, natural sciences, and cognitive creativity.',
      curriculum: 'National Curriculum &amp; Language Foundation',
    },
    {
      title: 'Middle Section (Grades 6 &ndash; 8)',
      description: 'Introduces computer programming, analytical problem solving, social sciences, and preliminary STEM experiments.',
      curriculum: 'National Curriculum &amp; Preliminary ICT Labs',
    },
    {
      title: 'Secondary Section (Grades 9 &ndash; 10)',
      description: 'Structured stream specialization across Science, Commerce, and Humanities with comprehensive board preparation.',
      curriculum: 'National Board Examination Syllabus',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Financial Transparency
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Academic Overview &amp; Tuition Fee Schedule
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Official breakdown of monthly tuition rates, classroom facilities, and stream structures.
        </p>
      </div>

      {/* Tuition Rates Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Class Tuition Fee Table
          </h2>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            Currency: BDT (৳)
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading tuition rates...
          </div>
        ) : fees.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No public monthly fee rates published currently.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="px-4 py-2.5">Academic Class</th>
                  <th className="px-4 py-2.5">Class Code</th>
                  <th className="px-4 py-2.5">Monthly Tuition Rate</th>
                  <th className="px-4 py-2.5">Billing Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                {fees.map((fee) => (
                  <tr key={fee.class_id || fee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                      {fee.class_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                      {fee.class_code || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900 dark:text-white">
                      ৳{parseFloat(fee.amount || fee.monthly_fee || 0).toLocaleString()} BDT
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                        Monthly Recurring
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Academic Sections Structure */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Academic Section Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {academicLevels.map((lvl, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 space-y-2"
            >
              <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                {lvl.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {lvl.description}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  Curriculum Framework
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {lvl.curriculum}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicMonthlyFeesPage;

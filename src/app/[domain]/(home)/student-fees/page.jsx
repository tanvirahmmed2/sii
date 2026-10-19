'use client';

import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
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
      title: 'Primary Section (Grades 1 – 5)',
      description: 'Focuses on building core language skills, foundational mathematics, natural sciences, and cognitive creativity.',
      curriculum: 'National Curriculum & Language Foundation',
    },
    {
      title: 'Middle Section (Grades 6 – 8)',
      description: 'Introduces computer programming, analytical problem solving, social sciences, and preliminary STEM experiments.',
      curriculum: 'National Curriculum & Preliminary ICT Labs',
    },
    {
      title: 'Secondary Section (Grades 9 – 10)',
      description: 'Structured stream specialization across Science, Commerce, and Humanities with comprehensive board preparation.',
      curriculum: 'National Board Examination Syllabus',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-start gap-2 border-b border-slate-200 dark:border-slate-800 pb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
            Financial Transparency
          </div>
          <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight">
            Academic Overview &amp; Tuition Fee Schedule
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-light">
            Official breakdown of monthly tuition rates, classroom facilities, and stream structures.
          </p>
        </motion.div>

        {/* Tuition Rates Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
              Class Tuition Fee Table
            </h2>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Currency: BDT (৳)
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center items-center">
              <div className="loader loader-sm" />
            </div>
          ) : fees.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 font-light">
              No public monthly fee rates published currently.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold tracking-wider">
                    <th className="px-5 py-3.5">Academic Class</th>
                    <th className="px-5 py-3.5">Class Code</th>
                    <th className="px-5 py-3.5">Monthly Tuition Rate</th>
                    <th className="px-5 py-3.5">Billing Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                  {fees.map((fee) => (
                    <tr key={fee.class_id || fee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                        {fee.class_name}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400">
                        {fee.class_code || '—'}
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-slate-900 dark:text-white">
                        ৳{parseFloat(fee.amount || fee.monthly_fee || 0).toLocaleString()} BDT
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                          Monthly Recurring
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Academic Sections Structure */}
        <div className="space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white"
          >
            Academic Section Breakdown
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {academicLevels.map((lvl, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 space-y-3.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-all shadow-xs"
              >
                <h3 className="font-serif text-lg font-normal text-slate-900 dark:text-white">
                  {lvl.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  {lvl.description}
                </p>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-primary block mb-0.5">
                    Curriculum Framework
                  </span>
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {lvl.curriculum}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicMonthlyFeesPage;

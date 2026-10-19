'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GradingScaleTable from 'src/component/website/cards/GradingScaleTable';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ClassesPage = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchClasses = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/classes'));
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setClasses(data.payload?.classes || data.paylod?.classes || data.classes || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    fetchClasses();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 space-y-8 transition-colors max-w-7xl mx-auto overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full border-b border-slate-200/80 dark:border-slate-800 pb-6"
      >
        <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 inline-block mb-2">
          Academic Structure
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
          Academic Class Programs
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
          Explore class programs, subject syllabus matrices, and grading benchmarks.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 animate-pulse space-y-3 shadow-xs"
            >
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls, idx) => {
            const classTarget = tenantUrl(`/classes/${cls.code || cls.id || cls}`);
            return (
              <motion.div
                key={cls.id || cls.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between gap-4 shadow-xs hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                      {cls.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {cls.code && (
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold">
                          {cls.code}
                        </span>
                      )}
                    </div>
                  </div>

                  {cls.motto && (
                    <p className="text-xs italic text-primary font-medium">
                      &ldquo;{cls.motto}&rdquo;
                    </p>
                  )}

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {cls.summary || `Access syllabus plans, subject schedules, and grading standards for ${cls.name}.`}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
                  {cls.expected_cost && parseFloat(cls.expected_cost) > 0 ? (
                    <span className="text-xs font-semibold text-primary">
                      ৳{parseFloat(cls.expected_cost).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ yr</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Academic Program</span>
                  )}
                  <Link
                    href={classTarget}
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View Curriculum &rarr;
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
            No active classes found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            There are currently no listed class records in the academic database.
          </p>
        </div>
      )}

      {/* Institutional Grading Scale Standard */}
      <GradingScaleTable
        title="Curriculum Grading System"
        subtitle="Overview of letter grades, mark range thresholds (%), and GPA points applied across all academic classes."
      />
    </div>
  );
};

export default ClassesPage;

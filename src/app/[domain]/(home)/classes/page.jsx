'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
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
        const res = await fetch(getApiEndpoint('classes'));
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
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Academic Structure
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Academic Class Programs
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Explore class programs, subject syllabus matrices, and grading benchmarks.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 animate-pulse space-y-3"
            >
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const classTarget = tenantUrl(`/classes/${cls.code || cls.id || cls}`);
            return (
              <div
                key={cls.id || cls.code}
                className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                      {cls.name}
                    </h3>
                    {cls.code && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {cls.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    Access syllabus plans, subject schedules, and grading standards for {cls.name}.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <Link
                    href={classTarget}
                    className="font-medium text-slate-900 dark:text-white hover:underline"
                  >
                    View Curriculum &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            No active classes found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
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

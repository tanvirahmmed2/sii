'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { AdmissionCircularCard } from 'src/component/website/cards';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AdmissionPage = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveCirculars = async () => {
      try {
        const res = await fetch(getApiEndpoint('admin/admissions'));
        const data = await res.json();
        const payload = data.payload || data.paylod;
        if (data.success && payload?.circulars) {
          const todayStr = new Date().toISOString().split('T')[0];
          const active = payload.circulars.filter(
            (c) => !c.finish_date || new Date(c.finish_date).toISOString().split('T')[0] >= todayStr
          );
          setCirculars(active);
        }
      } catch (err) {
        console.error('Failed to load active circulars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCirculars();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            Intake &amp; Enrollment
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Admission Circulars &amp; Direct Application
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Explore active entry drives, review intake guidelines, and register online.
          </p>
        </div>

        <Link
          href={tenantUrl('/apply')}
          className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition-colors shrink-0 self-start sm:self-auto"
        >
          General Application Form &rarr;
        </Link>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Active Admission Drives ({circulars.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 animate-pulse space-y-3"
              >
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : circulars.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {circulars.map((circular) => (
              <AdmissionCircularCard key={circular.id} circular={circular} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              No active admission circulars right now
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Upcoming seasonal intake circulars will be published here upon registrar announcement.
            </p>
            <div className="pt-2">
              <Link
                href={tenantUrl('/apply')}
                className="inline-block px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Submit General Application
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionPage;

'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import {
  FiFileText,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiAward,
  FiArrowRight,
  FiCheckCircle,
  FiPlus
} from 'react-icons/fi';

export default function AdmissionPortalPage() {
  const { tenantUrl } = useContext(TenantWebsiteContext);
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveCirculars = async () => {
      try {
        const res = await fetch('/api/domain/admissions/apply');
        const data = await res.json();
        if (data.success && data.circulars) {
          setCirculars(data.circulars);
        }
      } catch (err) {
        console.error('Failed to load active circulars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCirculars();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors max-w-6xl mx-auto">
      {/* Header */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded tracking-wider">
            Academic Admissions &amp; Enrollment
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Intake Circulars &amp; Direct Applications
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Explore active enrollment circulars, pay application fees online, and check published merit rankings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={tenantUrl('/admission/results')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-2xs"
          >
            <FiAward className="w-4 h-4" /> Check Merit Results
          </Link>
          <Link
            href={tenantUrl('/admission/apply')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-2xs"
          >
            <FiPlus className="w-4 h-4" /> Apply for Admission
          </Link>
        </div>
      </div>

      {/* Active Circulars Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Active Admission Drives ({circulars.length})
          </h2>
          <span className="text-[11px] text-slate-400">
            Open for online candidate submission
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse space-y-3"
              >
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : circulars.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {circulars.map((circ) => (
              <div
                key={circ.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs hover:border-sky-300 dark:hover:border-sky-800 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded">
                      {circ.class_name || 'All Classes'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Session {circ.session_name || '2026-2027'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                    {circ.title}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-1 pt-1">
                    <div className="flex items-center gap-1.5">
                      <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Deadline: {circ.end_date ? new Date(circ.end_date).toLocaleDateString() : 'Rolling'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FiUsers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Seats: <strong>{circ.total_seats || 'Open'}</strong> | Age: {circ.min_age ?? '0'}-{circ.max_age ?? '∞'} yrs</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Admission Fee</span>
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                      {parseFloat(circ.fee_amount || 0).toFixed(2)}
                    </span>{' '}
                    <span className="text-[10px] font-bold text-sky-600">
                      {circ.fee_currency || 'BDT'}
                    </span>
                  </div>

                  <Link
                    href={tenantUrl(`/admission/apply?admission_id=${circ.id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                  >
                    Apply Now <FiArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              No active intake circulars currently open
            </h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              Institutional circulars will be published here once announced by academic administration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

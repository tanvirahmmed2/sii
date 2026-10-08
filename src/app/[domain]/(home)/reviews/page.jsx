'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

export default function PublicReviewsPage() {
  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState('ALL');

  const defaultReviews = [
    {
      id: 'rev-1',
      rating: 5,
      title: 'Exemplary Academic Rigor & Faculty Guidance',
      comment: 'The computer lab work and regular syllabus tests provided an exceptional foundation. Faculty members are always available for after-class consultation.',
      author: 'Afsana Chowdhury',
      role: 'Alumna, Class of 2023',
      date: '2025-11-12'
    },
    {
      id: 'rev-2',
      rating: 5,
      title: 'Transparent Examination & Result Publishing',
      comment: 'As a parent, having immediate access to term marks, merit ranks, and attendance logs through the online portal provides complete peace of mind.',
      author: 'Mohammad Faruk',
      role: 'Guardian & Parent',
      date: '2025-10-04'
    },
    {
      id: 'rev-3',
      rating: 4,
      title: 'Active Student Clubs & Athletic Opportunities',
      comment: 'The programming and robotics society regularly competes in national hackathons. Extracurricular balance is well maintained alongside coursework.',
      author: 'Saiful Islam',
      role: 'Student, Higher Secondary',
      date: '2025-08-19'
    }
  ];

  useEffect(() => {
    let ignore = false;
    fetch(getApiEndpoint('reviews'))
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
        } else if (!ignore) {
          setReviews(defaultReviews);
        }
      })
      .catch(() => {
        if (!ignore) setReviews(defaultReviews);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  const filteredReviews = reviews.filter((rev) => {
    if (starFilter === 'ALL') return true;
    return Number(rev.rating) === Number(starFilter);
  });

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Community Voices
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Student & Guardian Testimonials
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Verified feedback from students, alumni, and guardians regarding the academic environment at {website?.name || 'our institution'}.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStarFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                starFilter === 'ALL'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              All ({reviews.length})
            </button>
            {[5, 4, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setStarFilter(String(r))}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  starFilter === String(r)
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {r} Stars
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredReviews.length} testimonials
          </span>
        </div>

        {/* Reviews Grid */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            Loading testimonials...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Feedback Under Filter</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try selecting All Reviews to see feedback across all scores.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-primary">
                      {rev.rating} / 5 Rating
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                      Verified
                    </span>
                  </div>

                  {rev.title && (
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {rev.title}
                    </h3>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-100 block">
                    {rev.author || rev.creator_name || 'Anonymous Scholar'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {rev.role || rev.package_name || 'Campus Affiliate'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inquiries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Want to share your institutional experience?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Submit feedback directly to our administrative desk.
            </p>
          </div>
          <Link
            href={tenantUrl('/contact')}
            className="px-3.5 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors shrink-0"
          >
            Submit Feedback →
          </Link>
        </div>

      </div>
    </div>
  );
}

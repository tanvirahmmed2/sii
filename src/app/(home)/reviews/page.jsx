'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BiStar,
  BiCheckCircle,
  BiLoaderAlt,
  BiMessageSquareDetail,
  BiUser,
  BiArrowBack,
  BiCheckShield,
  BiCube,
  BiChevronLeft,
  BiChevronRight,
} from 'react-icons/bi';
import { SITE_NAME } from 'src/lib/database/secret';

export default function PublicReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalApproved: 0,
    averageRating: '5.0',
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 9;
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (starFilter && starFilter !== 'ALL') {
      params.set('rating', starFilter);
    }

    fetch(`/api/marketing/reviews?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { success: false }))
      .then((data) => {
        if (!ignore && data.success) {
          setReviews(data.reviews || []);
          if (data.pagination) setPagination(data.pagination);
          if (data.stats) setStats(data.stats);
        }
      })
      .catch((err) => console.error('Failed to load reviews:', err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, limit, starFilter]);

  const handleFilterChange = (filter) => {
    setStarFilter(filter);
    setPage(1);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 w-full space-y-12">
      {/* Header & Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Loved by Creators, Trusted Worldwide
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Read authentic, verified experiences from creative professionals, designers, and developers who build their digital identity with {SITE_NAME}.
        </p>
      </div>

      {/* Social Proof Statistics Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Overall Score */}
        <div className="flex flex-col items-center justify-center text-center space-y-1">
          <div className="text-5xl font-black text-slate-900 leading-none">
            {stats.averageRating}
          </div>
          <div className="flex items-center text-amber-400 text-lg">
            {[1, 2, 3, 4, 5].map((s) => (
              <BiStar
                key={s}
                className={s <= Math.round(Number(stats.averageRating)) ? 'fill-current' : 'opacity-30'}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Based on {stats.totalApproved} verified subscriber reviews
          </p>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="md:col-span-2 pt-4 md:pt-0 md:pl-6 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingBreakdown?.[rating] || 0;
            const pct = stats.totalApproved > 0 ? (count / stats.totalApproved) * 100 : 0;
            return (
              <div
                key={rating}
                onClick={() => handleFilterChange(String(rating))}
                className="flex items-center gap-3 text-xs cursor-pointer group hover:opacity-80"
              >
                <span className="w-12 font-bold text-slate-700 flex items-center gap-1 shrink-0">
                  {rating} <BiStar className="text-amber-400" />
                </span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-slate-400 text-[11px] shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => handleFilterChange('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              starFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Reviews ({stats.totalApproved})
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleFilterChange(String(r))}
              className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                starFilter === String(r)
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{r}</span>
              <BiStar className="text-amber-400" />
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {reviews.length} of {pagination.total || 0} reviews (Page {pagination.page} of {pagination.totalPages || 1})
        </span>
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <BiLoaderAlt className="animate-spin text-4xl text-slate-700" />
          <p className="text-xs font-semibold">Loading verified reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto space-y-3">
          <BiMessageSquareDetail className="text-4xl text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No reviews found</h3>
          <p className="text-xs text-slate-500">
            {starFilter !== 'ALL'
              ? `There are no verified ${starFilter}-star reviews yet.`
              : 'No approved reviews are available yet.'}
          </p>
          {starFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => handleFilterChange('ALL')}
              className="text-xs font-bold text-slate-900 underline cursor-pointer"
            >
              Show all reviews
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-3">
                {/* Header: Stars & Verified Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex text-amber-400 text-base">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <BiStar
                        key={s}
                        className={s <= Number(rev.rating) ? 'fill-current' : 'opacity-20'}
                      />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <BiCheckShield className="text-xs" />
                    <span>Verified Creator</span>
                  </span>
                </div>

                {/* Review Title */}
                {rev.title && (
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {rev.title}
                  </h3>
                )}

                {/* Review Comment / Text */}
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &ldquo;{rev.comment || rev.review_text}&rdquo;
                </p>
              </div>

              {/* Reviewer Footnote */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {rev.creator_avatar ? (
                    <Image
                      src={rev.creator_avatar}
                      alt={rev.creator_name || rev.reviewer_name || 'Reviewer'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {(rev.creator_name || rev.reviewer_name || 'C').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {rev.creator_name || rev.reviewer_name || 'Verified Client'}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                      <BiCube className="text-indigo-500" />
                      <span>{rev.package_name || rev.institution_name || 'Subscriber'}</span>
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {new Date(rev.created_at).toLocaleDateString([], {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setPage((prev) => Math.max(1, prev - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
          >
            <BiChevronLeft className="text-base" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (p === 1 || p === pagination.totalPages) return true;
                return Math.abs(p - page) <= 2;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <span className="px-2 text-slate-400 text-xs select-none">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        page === p
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => {
              setPage((prev) => Math.min(pagination.totalPages, prev + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
          >
            <span>Next</span>
            <BiChevronRight className="text-base" />
          </button>
        </div>
      )}

      {/* Call to Action Card */}
      <div className="rounded-3xl bg-primary text-white p-8 sm:p-12 text-center w-full space-y-6 shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Ready to Elevate Your Portfolio?
        </h2>
        <p className="text-xs sm:text-sm  max-w-xl mx-auto leading-relaxed">
          Join thousands of satisfied creators who publish dynamic, high-converting portfolio websites in minutes with {SITE_NAME}.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
          <Link
            href="/packages"
            className="px-6 py-3 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
          >
            Explore Subscription Packages &rarr;
          </Link>
          <Link
            href="/creator/login"
            className="px-6 py-3 rounded-xl border border-slate-700 text-white text-xs font-bold bg-slate-500 hover:bg-slate-800 transition-colors"
          >
             Creator Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

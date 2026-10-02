'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Review from '../cards/Review';
import { BiChevronRight } from 'react-icons/bi';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/marketing/reviews?limit=20')
      .then((res) => (res.ok ? res.json() : { success: false }))
      .then((data) => {
        if (active && data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch((err) => console.error('Failed to load home reviews:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalReviews = reviews?.length || 0;

  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-12">
        {/* Section Heading */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
            Trusted by authorities and students worldwide
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Discover how creative professionals and modern businesses use our platform to build their online authority, sell products, and streamline operations.
          </p>
        </div>

        {/* Reviews Horizontal Scrolling Carousel / Row */}
        {loading ? (
          <div className="w-full overflow-x-auto pb-4 pt-2 px-1 scrollbar-none flex flex-row gap-5 justify-start">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="w-[320px] sm:w-[380px] h-[210px] bg-slate-100 dark:bg-slate-800/60 rounded-3xl animate-pulse shrink-0"
              />
            ))}
          </div>
        ) : totalReviews > 0 ? (
          <div className="w-full overflow-x-auto pb-4 pt-2 px-1 scrollbar-none flex flex-row gap-5 justify-start">
            {reviews.slice(0, 20).map((r) => (
              <Review key={r.id} review={r} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center max-w-md mx-auto space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No approved reviews published yet. Real client and creator reviews will appear here as they are verified.
            </p>
          </div>
        )}

        {/* Footer Link */}
        <div className="text-center pt-2">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-md"
          >
            <span>View All Reviews</span>
            <BiChevronRight className="text-base" />
          </Link>
        </div>
      </div>
    </section>
  );
}
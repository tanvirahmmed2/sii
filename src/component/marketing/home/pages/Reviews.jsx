'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Review from '../cards/Review';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;

    fetch('/api/marketing/reviews/home?limit=12')
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

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full space-y-12">
        {/* Section Heading & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 max-w-7xl mx-auto">
          <div className="space-y-3 max-w-2xl">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-full">
              Social Proof & Testimonials
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
              Trusted by authorities and students worldwide
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Discover how creative professionals and modern businesses use our platform to build their online authority, sell products, and streamline operations.
            </p>
          </div>

          {totalReviews > 0 && !loading && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="Previous reviews"
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                <BiChevronLeft className="text-2xl" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="Next reviews"
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                <BiChevronRight className="text-2xl" />
              </button>
            </div>
          )}
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
          <div
            ref={scrollRef}
            className="w-full overflow-x-auto pb-4 pt-2 px-1 scrollbar-none flex flex-row gap-5 justify-start scroll-smooth"
          >
            {reviews.map((r) => (
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
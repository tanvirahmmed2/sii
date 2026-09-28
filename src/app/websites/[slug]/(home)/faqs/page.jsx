'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BiSearch,
  BiHelpCircle,
  BiRefresh,
  BiChevronDown,
  BiRightArrowAlt,
  BiEnvelope,
} from 'react-icons/bi';

export default function FaqsPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [openIndex, setOpenIndex] = useState(0); // First item open by default

  const fetchPublishedFaqs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/faqs');
      const data = await res.json();
      if (data?.success && Array.isArray(data?.faqs)) {
        setFaqs(data.faqs);
      } else {
        setError(data?.error || 'Failed to load FAQs.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching frequently asked questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/faqs')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.success && Array.isArray(data?.faqs)) {
          setFaqs(data.faqs);
        } else {
          setError(data?.error || 'Failed to load FAQs.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Error fetching frequently asked questions.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const filteredFaqs = faqs.filter((faq) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (faq.question || '').toLowerCase().includes(q) ||
      (faq.answer || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50/60 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary text-white pt-20 pb-20 px-4 lg:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-4">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about building, launching, and managing your portfolio websites, custom domains, and creator tools.
          </p>

          {/* Search Bar */}
          <div className="pt-6 max-w-xl mx-auto">
            <div className="relative">
              <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" />
              <input
                type="text"
                placeholder="Search any question, keyword, or feature..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:bg-white/15 transition-all shadow-lg backdrop-blur-md"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold hover:text-white px-2 py-1 rounded-md bg-white/10 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main FAQs Accordion Section */}
      <section className="w-full px-4 lg:px-8 pt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BiHelpCircle className="text-primary text-2xl" /> Help &amp; Support Answers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredFaqs.length} frequently asked question{filteredFaqs.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPublishedFaqs}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchPublishedFaqs}
              className="text-rose-600 hover:underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="max-w-4xl mx-auto space-y-4 pt-8">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs animate-pulse flex items-center justify-between"
              >
                <div className="h-4 bg-slate-200 rounded-md w-2/3" />
                <div className="w-8 h-8 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredFaqs.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center my-8 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-4">
              <BiHelpCircle />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search ? 'No Matching Answers Found' : 'No FAQs Published Yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No question or answer matched "${search}". Try searching with different keywords or reach out to our team.`
                : 'Help center answers will appear here soon.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* Accordion List */
          <div className="max-w-4xl mx-auto space-y-4 pt-8">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.id}
                  className={`bg-white border rounded-2xl transition-all duration-200 overflow-hidden shadow-xs ${
                    isOpen
                      ? 'border-secondary/40 ring-1 ring-secondary/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                      {faq.question}
                    </span>
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen
                          ? 'bg-secondary text-white rotate-180'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <BiChevronDown className="text-xl" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100 whitespace-pre-line">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Creator & Support Call To Action */}
      <section className="w-full px-4 lg:px-8 mt-20">
        <div className="bg-linear-to-r from-slate-900 to-slate-950 rounded-3xl p-8 sm:p-12 text-white border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="text-2xl font-semibold tracking-tight">
              Still have questions or need custom onboarding?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore our comprehensive resources or reach out to our dedicated support specialists available 24/7.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition-all border border-white/15 flex items-center gap-2 cursor-pointer"
            >
              <BiEnvelope className="text-base" />
              <span>Contact Support</span>
            </Link>
            <Link
              href="/creator/login"
              className="px-6 py-3.5 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-semibold text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <span>Get Started Now</span>
              <BiRightArrowAlt className="text-lg" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

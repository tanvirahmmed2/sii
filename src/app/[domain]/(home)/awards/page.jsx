'use client';

import React, { useEffect, useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAward, FiSearch, FiCalendar, FiCheckCircle, FiStar, FiFilter, FiRefreshCw } from 'react-icons/fi';
import AwardCard from 'src/component/website/cards/AwardCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AwardsPage = () => {
  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        setLoading(true);
        // Primary endpoint: awards, fallback: recognitions
        const res = await fetch(getApiEndpoint('awards'));
        if (res.ok) {
          const data = await res.json();
          const list =
            data.payload?.awards ||
            data.paylod?.awards ||
            data.payload?.recognitions ||
            data.paylod?.recognitions ||
            data.awards ||
            data.recognitions ||
            [];
          setAwards(list);
        } else {
          // Try recognitions fallback
          const recRes = await fetch(getApiEndpoint('recognitions'));
          if (recRes.ok) {
            const recData = await recRes.json();
            const list =
              recData.payload?.awards ||
              recData.paylod?.awards ||
              recData.payload?.recognitions ||
              recData.recognitions ||
              recData.awards ||
              [];
            setAwards(list);
          }
        }
      } catch (err) {
        console.error('Failed to fetch institutional awards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAwards();
  }, [getApiEndpoint]);

  // Extract unique years
  const availableYears = useMemo(() => {
    const years = new Set();
    awards.forEach((a) => {
      if (a.year) years.add(a.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [awards]);

  // Filter & sort
  const filteredAwards = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = awards.filter((item) => {
      const matchSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.issuer?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        String(item.year || '').includes(q);

      const matchYear =
        selectedYear === 'all' || String(item.year) === String(selectedYear);

      return matchSearch && matchYear;
    });

    result.sort((a, b) => {
      const yearA = parseInt(a.year, 10) || 0;
      const yearB = parseInt(b.year, 10) || 0;
      if (sortOrder === 'desc') {
        return yearB - yearA || b.id - a.id;
      }
      return yearA - yearB || a.id - b.id;
    });

    return result;
  }, [awards, search, selectedYear, sortOrder]);

  const uniqueIssuersCount = useMemo(() => {
    const set = new Set();
    awards.forEach((a) => {
      if (a.issuer) set.add(a.issuer.toLowerCase());
    });
    return set.size;
  }, [awards]);

  const schoolTitle = website?.name || 'Institutional';

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        {/* Header Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/80 dark:border-slate-800 pb-8"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
              <FiAward className="text-sm" />
              <span>Honors &amp; Recognitions</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-slate-900 dark:text-white tracking-tight">
              Institutional Awards &amp; Honors
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-light leading-relaxed">
              Explore the prestigious recognitions, quality certifications, and national distinctions conferred upon{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">{schoolTitle}</span>.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 text-center shadow-xs">
              <div className="text-2xl font-bold text-primary font-mono">{awards.length}</div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Awards
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 text-center shadow-xs">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-mono">
                {availableYears.length || 1}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Conferral Years
              </div>
            </div>
            <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 text-center shadow-xs">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {uniqueIssuersCount || 1}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Accreditors
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filter & Search Bar */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Year Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  selectedYear === 'all'
                    ? 'bg-primary text-white shadow-primary/20'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-primary/50'
                }`}
              >
                All Years ({awards.length})
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(String(yr))}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    String(selectedYear) === String(yr)
                      ? 'bg-primary text-white shadow-primary/20'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-primary/50'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Search Input & Sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  id="awards-search-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search awards, issuers..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Order Toggle */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                title="Toggle sort order by year"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50 transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                <span className="text-[10px] text-slate-400">⇅</span>
              </button>
            </div>
          </div>

          {/* Results feedback */}
          {(search || selectedYear !== 'all') && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{filteredAwards.length}</strong> of{' '}
                {awards.length} awards
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedYear('all');
                }}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <FiRefreshCw className="text-[10px]" />
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* Award Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-4 animate-pulse shadow-xs"
              >
                <div className="w-full aspect-[4/3] bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="space-y-2">
                  <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="w-full h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                  <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="w-6 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAwards.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <FiAward className="text-3xl" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-semibold text-slate-900 dark:text-white">
                No Awards Matching Criteria
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No institutional awards match your current search or year filter. Try adjusting your search query.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedYear('all');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAwards.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
                className="h-full"
              >
                <AwardCard award={item} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Institutional Accreditation Footnote Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary-light text-[11px] font-bold uppercase tracking-wider border border-primary/30">
              <FiCheckCircle className="text-xs" />
              <span>Verified Institution of Academic Merit</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-white">
              Committed to Continuous Educational Quality
            </h2>
            <p className="text-xs text-slate-300 max-w-xl font-light">
              All listed distinctions undergo rigorous assessment by authorized governing bodies, regulatory boards, and international educational juries.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={tenantUrl('/about')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-xs"
            >
              About Campus
            </Link>
            <Link
              href={tenantUrl('/contact')}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-600 hover:border-slate-400 text-white transition-colors"
            >
              Contact Administration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardsPage;

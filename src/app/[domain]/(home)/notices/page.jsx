'use client';

import React, { useEffect, useState, useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFileText, FiCalendar } from 'react-icons/fi';
import NoticeCard from 'src/component/website/cards/NoticeCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const NoticesPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch(getApiEndpoint('notices'));
        if (res.ok) {
          const data = await res.json();
          setNotices(data.payload?.notices || data.paylod?.notices || data.notices || []);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, [getApiEndpoint]);

  const filteredNotices = useMemo(() => {
    if (!searchQuery.trim()) return notices;
    const query = searchQuery.toLowerCase().trim();
    return notices.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.description && n.description.toLowerCase().includes(query))
    );
  }, [notices, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
              Registry Bulletin
            </div>
            <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight">
              Official Notices &amp; Announcements
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-light">
              Access the latest circulars, examination routines, schedules, and administrative directives.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full md:w-72 shrink-0">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
              />
            </div>
          </div>
        </motion.div>

        {/* Notices listing */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 animate-pulse flex items-center justify-between shadow-xs"
              >
                <div className="space-y-2.5 w-2/3">
                  <div className="w-48 sm:w-64 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="w-24 sm:w-36 h-3 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="flex gap-2">
                  <div className="w-20 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="w-24 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotices.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Showing <strong className="text-slate-700 dark:text-slate-200">{filteredNotices.length}</strong> {filteredNotices.length === 1 ? 'notice' : 'notices'}
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>

            {filteredNotices.map((notice, idx) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.4) }}
              >
                <NoticeCard notice={notice} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <FiFileText className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg text-slate-900 dark:text-white">
              {searchQuery ? 'No matching notices found' : 'No notices published'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto font-light">
              {searchQuery
                ? `No notices matched your keyword "${searchQuery}". Try a different search term.`
                : 'There are currently no active administrative notices on the bulletin.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition shadow-xs cursor-pointer"
              >
                Reset Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticesPage;

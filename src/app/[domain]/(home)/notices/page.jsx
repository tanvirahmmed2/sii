'use client';

import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import NoticeCard from 'src/component/website/cards/NoticeCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const NoticesPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/notices'));
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

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-start gap-2 border-b border-slate-200 dark:border-slate-800 pb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
            Registry Bulletin
          </div>
          <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight">
            Official Notices &amp; Announcements
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl font-light">
            Access the latest circulars, examination routines, schedules, and administrative directives.
          </p>
        </motion.div>

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
                <div className="w-24 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : notices.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {notices.map((notice, idx) => (
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
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-12 text-center shadow-xs">
            <h3 className="font-serif text-lg text-slate-900 dark:text-white">
              No notices published
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto font-light">
              There are currently no active administrative notices on the bulletin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticesPage;

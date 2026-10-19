'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NoticeCard from 'src/component/website/cards/NoticeCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const Notices = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/notices?home=true'));
        if (res.ok) {
          const data = await res.json();
          setNotices(data.payload?.notices || data.paylod?.notices || []);
        }
      } catch (err) {
        console.error('Error fetching home notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, [getApiEndpoint]);

  return (
    <section className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-16 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5"
        >
          <div>
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              Official Bulletin
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mt-1">
              Administrative Notices &amp; Circulars
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Updates released by the registrar office, exam control cell, and departments.
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/notices')}
              className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 hover:text-primary font-semibold px-4 py-2 rounded-xl transition-all duration-300 shadow-xs text-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              All Notices ({notices.length}) &rarr;
            </Link>
          </motion.div>
        </motion.div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="loader loader-sm" />
          </div>
        ) : notices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No circulars or notices published at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((notice, index) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.08, 0.4) }}
              >
                <NoticeCard notice={notice} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Notices;
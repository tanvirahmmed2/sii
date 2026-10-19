'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NewsCard from 'src/component/website/cards/NewsCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const News = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(getApiEndpoint('home/news?home=true'));
        if (res.ok) {
          const data = await res.json();
          setNewsList(data.payload?.news || data.paylod?.news || []);
        }
      } catch (err) {
        console.error('Error fetching home news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
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
              Campus Journalism
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mt-1">
              Latest Campus News &amp; Articles
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Educational achievements, department milestones, and faculty initiatives.
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={tenantUrl('/news')}
              className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-700 hover:border-primary text-slate-800 dark:text-slate-200 hover:text-primary font-semibold px-4 py-2 rounded-xl transition-all duration-300 shadow-xs text-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              All News ({newsList.length}) &rarr;
            </Link>
          </motion.div>
        </motion.div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="loader loader-sm" />
          </div>
        ) : newsList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No news articles published at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsList.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.08, 0.4) }}
              >
                <NewsCard news={item} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default News;
'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import NewsCard from 'src/component/website/cards/NewsCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const News = () => {
  const { tenantUrl, getApiEndpoint } = useContext(TenantWebsiteContext);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(getApiEndpoint('news/home'));
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
    <section className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
              Campus Journalism
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Latest Campus News &amp; Articles
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Educational achievements, department milestones, and faculty initiatives.
            </p>
          </div>

          <Link
            href={tenantUrl('/news')}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 self-start sm:self-auto"
          >
            All News ({newsList.length}) &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading recent news...
          </div>
        ) : newsList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No news articles published at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsList.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default News;
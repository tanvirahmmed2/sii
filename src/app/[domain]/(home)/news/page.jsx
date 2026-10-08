'use client';

import React, { useEffect, useState, useContext } from 'react';
import NewsCard from 'src/component/website/cards/NewsCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const NewsPage = () => {
  const { getApiEndpoint } = useContext(TenantWebsiteContext);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(getApiEndpoint('news'));
        if (res.ok) {
          const data = await res.json();
          setNews(data.payload?.news || data.paylod?.news || data.news || []);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 space-y-6 transition-colors">
      <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
          Campus Press
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
          Campus News &amp; Dispatches
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Stay informed on academics, student milestones, department research, and community initiatives.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 animate-pulse space-y-3"
            >
              <div className="w-full h-36 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : news.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            No news articles published
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            There are currently no articles in the campus journalism feed.
          </p>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
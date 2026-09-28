'use client';

import React, { useEffect, useState } from 'react';
import NewsCard from '@/component/cards/NewsCard';
import { FiFileText } from 'react-icons/fi';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await res.json();
          setNews(data.paylod.news || []);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="w-full">
        <div className="text-center mb-12">
          
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 tracking-tight">
            Campus News 
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
            Stay tuned with updates on academics, student achievements, campus activities, and scientific breakthroughs.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs animate-pulse flex flex-col gap-4">
                <div className="w-full h-44 bg-slate-200 rounded-xl"></div>
                <div className="w-24 h-4 bg-slate-200 rounded"></div>
                <div className="w-3/4 h-6 bg-slate-200 rounded"></div>
                <div className="w-full h-12 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-md mx-auto shadow-xs mt-8">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto text-xl mb-4">
              <FiFileText />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No news articles published</h3>
            <p className="text-slate-500 text-xs mt-1">
              There are currently no featured stories or news feeds cataloged.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
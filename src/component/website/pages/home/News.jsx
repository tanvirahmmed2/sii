'use client';

import React, { useEffect, useState } from 'react';
import { FiInfo, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import NewsCard from 'src/component/website/cards/NewsCard';

const News = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news/home');
        if (res.ok) {
          const data = await res.json();
          setNewsList(data.paylod?.news || data.payload?.news || []);
        }
      } catch (err) {
        console.error('Error fetching home news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 tracking-tight">
            Latest Campus News
          </h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm">
            Read updates on educational advancements, department news, faculty research journals, and campus initiatives.
          </p>
        </div>

        {loading ? (
          <div className="w-full py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : newsList.length === 0 ? (
          <div className="w-full py-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-sm mb-3">
              <FiInfo />
            </div>
            <p className="text-slate-400 text-xs font-medium">No news articles published at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsList.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-secondary text-xs font-bold transition-all shadow-xs hover:shadow-md"
          >
            <span>View All News</span>
            <FiArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default News;
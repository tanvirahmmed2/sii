'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiCalendar, FiFileText, FiClock } from 'react-icons/fi';
import Image from 'next/image';

const NewsDetailPage = () => {
  const { slug } = useParams();
  const [newsItem, setNewsItem] = useState(null);
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [singleRes, listRes] = await Promise.all([
          fetch(`/api/news/${slug}`),
          fetch('/api/news')
        ]);

        if (singleRes.ok) {
          const data = await singleRes.json();
          setNewsItem(data.paylod?.news || null);
        }

        if (listRes.ok) {
          const listData = await listRes.json();
          const allNews = listData.paylod?.news || [];
          setRecentNews(allNews.filter((n) => n.slug !== slug && String(n.id) !== String(slug)).slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch news detail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-xs font-semibold">Loading news article...</p>
        </div>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4">
        <div className="max-w-7xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-xs text-center space-y-4">
          <FiFileText className="text-4xl text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Article Not Found</h2>
          <p className="text-slate-500 text-xs">The news article you are looking for may have been removed or updated.</p>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all"
          >
            <FiArrowLeft /> Back to News Feeds
          </Link>
        </div>
      </div>
    );
  }

  const newsDate = newsItem.created_at ? new Date(newsItem.created_at) : null;

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
      
        <div>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FiArrowLeft />
            <span>Back to News Feeds</span>
          </Link>
        </div>

        <article className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        
          {newsItem.image && (
            <div className="w-full  bg-slate-100 overflow-hidden relative">
              <Image width={1000} height={1000}
                src={newsItem.image}
                alt={newsItem.title}
                className="w-full h-full object-cover "
              />
            </div>
          )}

          <div className="p-6  space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-wider">
                  Campus News
                </span>
                {newsDate && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                    <FiCalendar className="text-primary" />
                    {newsDate.toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight leading-snug">
                {newsItem.title}
              </h1>
            </div>

            <div className="prose prose-slate max-w-none text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-6">
              {newsItem.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}
            </div>
          </div>
        </article>

        {recentNews.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold text-slate-900">More Recent Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug || item.id}`}
                  className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-primary-light hover:shadow-sm transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-primary mt-3 block">
                    Read Article &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsDetailPage;

'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const NewsDetailPage = () => {
  const { slug } = useParams();
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [newsItem, setNewsItem] = useState(null);
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [singleRes, listRes] = await Promise.all([
          fetch(getApiEndpoint(`news/${slug}`)),
          fetch(getApiEndpoint('news'))
        ]);

        if (singleRes.ok) {
          const data = await singleRes.json();
          setNewsItem(data.paylod?.news || data.payload?.news || null);
        }

        if (listRes.ok) {
          const listData = await listRes.json();
          const allNews = listData.paylod?.news || listData.payload?.news || [];
          setRecentNews(allNews.filter((n) => n.slug !== slug && String(n.id) !== String(slug)).slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch news detail:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug, getApiEndpoint]);

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading news article...</span>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-6 rounded border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Article Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The news story you are requesting does not exist or was archived.</p>
          <Link
            href={tenantUrl('/news')}
            className="inline-block px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
          >
            ← Back to News Archive
          </Link>
        </div>
      </div>
    );
  }

  const newsDate = newsItem.created_at ? new Date(newsItem.created_at) : null;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div>
          <Link
            href={tenantUrl('/news')}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Press & Bulletins
          </Link>
        </div>

        <article className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {newsItem.image && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                fill
                src={newsItem.image}
                alt={newsItem.title}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-primary bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                  Campus Press
                </span>
                {newsDate && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {newsDate.toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {newsItem.title}
              </h1>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap border-t border-slate-100 dark:border-slate-800 pt-4">
              {newsItem.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}
            </div>
          </div>
        </article>

        {recentNews.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Recent Dispatches
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentNews.map((item) => (
                <Link
                  key={item.id}
                  href={tenantUrl(`/news/${item.slug || item.id}`)}
                  className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800 hover:border-primary transition-colors flex flex-col justify-between space-y-2 block"
                >
                  <div className="space-y-1">
                    <h3 className="font-medium text-xs text-slate-900 dark:text-slate-100 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.content?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-primary">
                    Read Story →
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

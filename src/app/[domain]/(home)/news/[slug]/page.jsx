'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
          fetch(getApiEndpoint(`home/news/${slug}`)),
          fetch(getApiEndpoint('home/news'))
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
        <div className="loader loader-md" />
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-3">
          <h2 className="text-base font-serif font-medium text-slate-900 dark:text-slate-100">Article Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light">The news story you are requesting does not exist or was archived.</p>
          <Link
            href={tenantUrl('/news')}
            className="inline-block px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-dark transition-all shadow-xs"
          >
            &larr; Back to News Archive
          </Link>
        </div>
      </div>
    );
  }

  const newsDate = newsItem.created_at ? new Date(newsItem.created_at) : null;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href={tenantUrl('/news')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors shadow-xs"
          >
            &larr; Back to Press &amp; Bulletins
          </Link>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden"
        >
          {newsItem.image && (
            <div className="w-full h-64 sm:h-96 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                fill
                src={newsItem.image}
                alt={newsItem.title}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-primary-dark dark:text-primary-light bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  Campus Press
                </span>
                {newsDate && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {newsDate.toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {newsItem.title}
              </h1>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap border-t border-slate-100 dark:border-slate-800/80 pt-5">
              {newsItem.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}
            </div>
          </div>
        </motion.article>

        {recentNews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="space-y-4 pt-4"
          >
            <h2 className="font-serif text-lg font-medium text-slate-900 dark:text-slate-100">
              Recent Dispatches
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentNews.map((item, idx) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={tenantUrl(`/news/${item.slug || item.id}`)}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between space-y-3 block group h-full shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <h3 className="font-serif font-medium text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.content?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                      Read Story <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NewsDetailPage;

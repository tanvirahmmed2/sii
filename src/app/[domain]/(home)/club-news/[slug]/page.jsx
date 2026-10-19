'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const ClubNewsDetailPage = () => {
  const { slug } = useParams();
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [clubNews, setClubNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubNews = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint(`home/club-news/${slug}`));
        if (res.ok) {
          const data = await res.json();
          const item = data.payload?.clubNews || data.paylod?.clubNews || null;
          setClubNews(item);

          if (item?.slug && typeof window !== 'undefined' && slug !== item.slug) {
            window.history.replaceState(null, '', tenantUrl(`/club-news/${item.slug}`));
          }
        }
      } catch (err) {
        console.error('Error fetching club news:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchClubNews();
  }, [slug, getApiEndpoint, tenantUrl]);

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
        <div className="loader loader-md" />
      </div>
    );
  }

  if (!clubNews) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-3">
          <h2 className="text-base font-serif font-medium text-slate-900 dark:text-slate-100">Article Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light">The requested society article could not be located.</p>
          <Link
            href={tenantUrl('/club-news')}
            className="inline-block px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-dark transition-all shadow-xs"
          >
            &larr; Back to Club News
          </Link>
        </div>
      </div>
    );
  }

  const coverImage = clubNews.image_url || clubNews.image;
  const newsDate = clubNews.created_at ? new Date(clubNews.created_at) : null;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-4"
        >
          <Link
            href={tenantUrl('/club-news')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors shadow-xs"
          >
            &larr; Back to All Club News
          </Link>

          {clubNews.club_slug && (
            <Link
              href={tenantUrl(`/clubs/${clubNews.club_slug}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors shadow-xs"
            >
              Society: {clubNews.club_name || 'View Club'} &rarr;
            </Link>
          )}
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden"
        >
          {coverImage && (
            <div className="w-full h-64 sm:h-96 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                fill
                src={coverImage}
                alt={clubNews.title || 'Club news'}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {clubNews.club_name && (
                  <span className="text-[10px] font-semibold text-primary-dark dark:text-primary-light bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
                    {clubNews.club_name}
                  </span>
                )}
                {newsDate && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {newsDate.toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {clubNews.title}
              </h1>
            </div>

            <div 
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-5"
              dangerouslySetInnerHTML={{ __html: clubNews.content || '' }}
            />
          </div>
        </motion.article>
      </div>
    </div>
  );
};

export default ClubNewsDetailPage;

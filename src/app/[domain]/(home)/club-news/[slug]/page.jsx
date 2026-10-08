'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
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
        const res = await fetch(getApiEndpoint(`club-news/${slug}`));
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
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading club announcement...</span>
      </div>
    );
  }

  if (!clubNews) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-6 rounded border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Article Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested society article could not be located.</p>
          <Link
            href={tenantUrl('/club-news')}
            className="inline-block px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
          >
            ← Back to Club News
          </Link>
        </div>
      </div>
    );
  }

  const coverImage = clubNews.image_url || clubNews.image;
  const newsDate = clubNews.created_at ? new Date(clubNews.created_at) : null;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between gap-4">
          <Link
            href={tenantUrl('/club-news')}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to All Club News
          </Link>

          {clubNews.club_slug && (
            <Link
              href={tenantUrl(`/clubs/${clubNews.club_slug}`)}
              className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-primary transition-colors"
            >
              Society: {clubNews.club_name || 'View Club'} →
            </Link>
          )}
        </div>

        <article className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {coverImage && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                fill
                src={coverImage}
                alt={clubNews.title || 'Club news'}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {clubNews.club_name && (
                  <span className="text-[10px] font-medium text-primary bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                    {clubNews.club_name}
                  </span>
                )}
                {newsDate && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {newsDate.toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {clubNews.title}
              </h1>
            </div>

            <div 
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4"
              dangerouslySetInnerHTML={{ __html: clubNews.content || '' }}
            />
          </div>
        </article>
      </div>
    </div>
  );
};

export default ClubNewsDetailPage;

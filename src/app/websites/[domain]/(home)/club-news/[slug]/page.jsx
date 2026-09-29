'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiCalendar, FiUsers, FiFileText } from 'react-icons/fi';
import Image from 'next/image';

const ClubNewsDetailPage = () => {
  const { slug } = useParams();
  const [clubNews, setClubNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubNews = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/club-news/${slug}`);
        if (res.ok) {
          const data = await res.json();
          const item = data.payload?.clubNews || data.paylod?.clubNews || null;
          setClubNews(item);

          if (item?.slug && typeof window !== 'undefined' && slug !== item.slug) {
            window.history.replaceState(null, '', `/club-news/${item.slug}`);
          }
        }
      } catch (err) {
        console.error('Error fetching club news:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchClubNews();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-xs font-semibold">Loading club announcement...</p>
        </div>
      </div>
    );
  }

  if (!clubNews) {
    return (
      <div className="w-full min-h-screen bg-slate-50/50 py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-100 shadow-xs text-center space-y-4">
          <FiFileText className="text-4xl text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Club Article Not Found</h2>
          <p className="text-slate-500 text-xs">The requested club announcement or news article could not be loaded.</p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/club-news"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all"
            >
              <FiArrowLeft /> Back to Club News
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const coverImage = clubNews.image_url || clubNews.image;
  const newsDate = clubNews.created_at ? new Date(clubNews.created_at) : null;

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/club-news"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors"
          >
            <FiArrowLeft />
            <span>All Club News</span>
          </Link>

          {clubNews.club_slug && (
            <Link
              href={`/clubs/${clubNews.club_slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light text-primary hover:bg-primary-light/80 font-bold text-xs rounded-xl transition-colors border border-primary-light"
            >
              <FiUsers />
              <span>{clubNews.club_name || 'Club'}</span>
            </Link>
          )}
        </div>

        <article className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {coverImage && (
            <div className="w-full bg-slate-100 overflow-hidden relative">
              <Image width={1000} height={1000}
                src={coverImage}
                alt={clubNews.title || 'Club news cover image'}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 md:p-10 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {clubNews.club_name && (
                  <span className="text-xs font-bold text-primary bg-primary-light border border-primary-light px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <FiUsers /> {clubNews.club_name}
                  </span>
                )}
                {newsDate && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <FiCalendar className="text-primary" />
                    {newsDate.toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-snug">
                {clubNews.title}
              </h1>
            </div>

            {/* Rich HTML Content */}
            <div 
              className="prose prose-slate max-w-none text-slate-700 text-sm md:text-base leading-relaxed border-t border-slate-100 pt-6"
              dangerouslySetInnerHTML={{ __html: clubNews.content || '' }}
            />
          </div>
        </article>
      </div>
    </div>
  );
};

export default ClubNewsDetailPage;

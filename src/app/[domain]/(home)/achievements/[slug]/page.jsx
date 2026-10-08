'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const AchievementDetailPage = () => {
  const { slug } = useParams();
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [achievement, setAchievement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievement = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint(`achievements/${slug}`));
        if (res.ok) {
          const data = await res.json();
          setAchievement(data.paylod?.achievement || data.payload?.achievement || null);
        }
      } catch (err) {
        console.error('Error fetching achievement:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchAchievement();
  }, [slug, getApiEndpoint]);

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Loading achievement details...
        </span>
      </div>
    );
  }

  if (!achievement) {
    return (
      <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-12 px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-6 rounded border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Achievement Record Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The requested milestone or distinction does not exist or has been retracted.
          </p>
          <Link
            href={tenantUrl('/achievements')}
            className="inline-block px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary-dark transition-colors"
          >
            ← Back to Achievements
          </Link>
        </div>
      </div>
    );
  }

  const coverImage = achievement.image_url || achievement.image;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div>
          <Link
            href={tenantUrl('/achievements')}
            className="inline-block text-xs font-medium text-primary hover:underline"
          >
            ← Back to Achievements List
          </Link>
        </div>

        {/* Card Detail */}
        <article className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {coverImage && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                src={coverImage}
                alt={achievement.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block">
                Institutional Milestone
              </span>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {achievement.title}
              </h1>
            </div>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 whitespace-pre-wrap">
              {stripHtml(achievement.description)}
            </div>
          </div>
        </article>

      </div>
    </div>
  );
};

export default AchievementDetailPage;

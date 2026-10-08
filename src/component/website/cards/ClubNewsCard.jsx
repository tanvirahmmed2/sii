'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const ClubNewsCard = ({ clubNews, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!clubNews) return null;

  const { title, content, summary, image_url, club_name, created_at, slug, id } = clubNews;
  const newsDate = created_at ? new Date(created_at) : null;
  const targetHref = tenantUrl(href || `/club-news/${slug || id}`);

  const excerpt = summary || (content ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');

  return (
    <Link
      href={targetHref}
      className={`bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col justify-between overflow-hidden group h-full ${className}`}
    >
      <div>
        {image_url && (
          <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <Image
              src={image_url}
              alt={title || 'Club Bulletin'}
              width={500}
              height={300}
              className="w-full h-full object-cover"
              unoptimized={image_url.startsWith('http')}
            />
          </div>
        )}

        <div className="p-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            {club_name && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase tracking-wider">
                {club_name}
              </span>
            )}
            {newsDate && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {newsDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:underline line-clamp-2">
            {title}
          </h3>

          {excerpt && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-3 leading-relaxed">
              {excerpt}
            </p>
          )}
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
        <span>Read Bulletin</span>
        <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
      </div>
    </Link>
  );
};

export default ClubNewsCard;

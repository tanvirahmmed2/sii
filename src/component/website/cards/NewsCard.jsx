'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const NewsCard = ({ news, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!news) return null;

  const { title, content, image, created_at, slug, id } = news;
  const newsDate = created_at ? new Date(created_at) : null;
  const cleanSnippet = content ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

  const targetHref = tenantUrl(href || `/news/${slug || id}`);

  return (
    <Link
      href={targetHref}
      className={`group bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col overflow-hidden h-full ${className}`}
    >
      {image && (
        <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
          <Image
            src={image}
            alt={title}
            width={500}
            height={300}
            className="w-full h-full object-cover"
            unoptimized={image.startsWith('http')}
          />
        </div>
      )}

      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
        <div className="space-y-1.5">
          {newsDate && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Published: {newsDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
          )}

          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug group-hover:underline line-clamp-2">
            {title}
          </h3>

          {cleanSnippet && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-3 leading-relaxed">
              {cleanSnippet}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          <span>Read Full Article</span>
          <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
        </div>
      </div>
    </Link>
  );
};

export default NewsCard;

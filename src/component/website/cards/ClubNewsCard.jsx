'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const ClubNewsCard = ({ clubNews, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!clubNews) return null;

  const { title, content, summary, image_url, club_name, created_at, slug, id } = clubNews;
  const newsDate = created_at ? new Date(created_at) : null;
  const targetHref = tenantUrl(href || `/club-news/${slug || id}`);

  const excerpt = summary || (content ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Link
        href={targetHref}
        className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors duration-200 flex flex-col justify-between overflow-hidden group h-full ${className}`}
      >
      <div>
        {image_url && (
          <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <Image
              src={image_url}
              alt={title || 'Club Bulletin'}
              width={500}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={image_url.startsWith('http')}
            />
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center gap-2">
            {club_name && (
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase tracking-wider">
                {club_name}
              </span>
            )}
            {newsDate && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {newsDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>

          {excerpt && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-3 leading-relaxed">
              {excerpt}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-primary">
        <span>Read Bulletin</span>
        <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
      </div>
      </Link>
    </motion.div>
  );
};

export default ClubNewsCard;

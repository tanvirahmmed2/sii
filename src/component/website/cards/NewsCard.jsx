'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const NewsCard = ({ news, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!news) return null;

  const { title, content, image, created_at, slug, id } = news;
  const newsDate = created_at ? new Date(created_at) : null;
  const cleanSnippet = content ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

  const targetHref = tenantUrl(href || `/news/${slug || id}`);

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Link
        href={targetHref}
        className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors duration-200 flex flex-col overflow-hidden h-full ${className}`}
      >
      {image && (
        <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
          <Image
            src={image}
            alt={title}
            width={500}
            height={300}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={image.startsWith('http')}
          />
        </div>
      )}

      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-2.5">
        <div className="space-y-1.5">
          {newsDate && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              Published: {newsDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
          )}

          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>

          {cleanSnippet && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-3 leading-relaxed">
              {cleanSnippet}
            </p>
          )}
        </div>

        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-primary">
          <span>Read Full Article</span>
          <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
        </div>
      </div>
      </Link>
    </motion.div>
  );
};

export default NewsCard;

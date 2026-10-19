'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const AchievementCard = ({ achievement, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!achievement) return null;

  const { title, description, image_url, image } = achievement;
  const coverImage = image_url || image;
  const cleanDescription = stripHtml(description);
  const targetHref = tenantUrl(href || `/achievements/${achievement.slug || achievement.id}`);

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
        {coverImage && (
          <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <Image
              src={coverImage}
              alt={title}
              width={500}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={coverImage.startsWith('http')}
            />
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-1.5">
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
            Campus Milestone
          </span>

          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>

          {cleanDescription && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-3 leading-relaxed">
              {cleanDescription}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-primary">
        <span>View Full Milestone</span>
        <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
      </div>
      </Link>
    </motion.div>
  );
};

export default AchievementCard;

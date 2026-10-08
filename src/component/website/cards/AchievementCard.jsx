'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <Link
      href={targetHref}
      className={`bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col justify-between overflow-hidden group h-full ${className}`}
    >
      <div>
        {coverImage && (
          <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <Image
              src={coverImage}
              alt={title}
              width={500}
              height={300}
              className="w-full h-full object-cover"
              unoptimized={coverImage.startsWith('http')}
            />
          </div>
        )}

        <div className="p-3.5 space-y-1.5">
          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
            Campus Milestone
          </span>

          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:underline line-clamp-2">
            {title}
          </h3>

          {cleanDescription && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-3 leading-relaxed">
              {cleanDescription}
            </p>
          )}
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
        <span>View Full Milestone</span>
        <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
      </div>
    </Link>
  );
};

export default AchievementCard;

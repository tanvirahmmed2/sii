'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const RecognitionCard = ({ recognition, item, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  const data = recognition || item;
  if (!data) return null;

  const { name, title, awarded_by, given_by, date, image, image_url, slug, id } = data;
  const cardTitle = name || title || 'Honor & Recognition';
  const coverImage = image || image_url;
  const awardedBy = awarded_by || given_by || data.awardedBy || data.givenBy;
  const targetSlug = slug || id;
  const targetHref = tenantUrl(href || `/recognitions/${targetSlug}`);

  const formattedDate = date
    ? new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      href={targetHref}
      className={`group bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col justify-between overflow-hidden h-full ${className}`}
    >
      <div>
        {coverImage && (
          <div className="w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center p-2">
            <Image
              src={coverImage}
              alt={cardTitle}
              width={400}
              height={300}
              className="w-full h-full object-contain"
              unoptimized={coverImage.startsWith('http')}
            />
          </div>
        )}

        <div className="p-3.5 space-y-1 text-center">
          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 uppercase tracking-wider">
            Official Award
          </span>

          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:underline line-clamp-2 pt-1">
            {cardTitle}
          </h3>

          {awardedBy && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Awarded By: {awardedBy}
            </p>
          )}

          {formattedDate && (
            <span className="text-[10px] text-slate-400 font-mono block">
              {formattedDate}
            </span>
          )}
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
        <span>Citation Details</span>
        <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
      </div>
    </Link>
  );
};

export default RecognitionCard;

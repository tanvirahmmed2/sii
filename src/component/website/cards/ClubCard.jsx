'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const ClubCard = ({ club, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!club) return null;

  const { id, name, slug, motto, description, image } = club;
  const cleanDescription = stripHtml(description);
  const targetUrl = tenantUrl(`/clubs/${slug || id}`);

  return (
    <Link
      href={targetUrl}
      className={`bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col justify-between overflow-hidden group ${className}`}
    >
      <div>
        {image ? (
          <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <Image
              src={image}
              alt={name}
              width={500}
              height={300}
              className="w-full h-full object-cover"
              unoptimized={image.startsWith('http')}
            />
          </div>
        ) : (
          <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-3">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              {name?.slice(0, 3) || 'CLB'}
            </span>
          </div>
        )}

        <div className="p-3.5 space-y-1.5">
          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:underline">
            {name}
          </h3>

          {motto && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono italic line-clamp-1">
              &ldquo;{motto}&rdquo;
            </p>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
            {cleanDescription || 'Student activity and enrichment organization.'}
          </p>
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
        <span>Club Activities</span>
        <span className="font-mono text-[10px] text-slate-400">&rarr;</span>
      </div>
    </Link>
  );
};

export default ClubCard;

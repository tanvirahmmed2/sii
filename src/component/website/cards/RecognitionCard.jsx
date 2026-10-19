'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Link
        href={targetHref}
        className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors duration-200 flex flex-col justify-between overflow-hidden h-full ${className}`}
      >
      <div>
        {coverImage && (
          <div className="w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center p-3">
            <Image
              src={coverImage}
              alt={cardTitle}
              width={400}
              height={300}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              unoptimized={coverImage.startsWith('http')}
            />
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-1.5 text-center">
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
            Official Award
          </span>

          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-primary transition-colors line-clamp-2 pt-1">
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

      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-primary">
        <span>Citation Details</span>
        <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
      </div>
      </Link>
    </motion.div>
  );
};

export default RecognitionCard;

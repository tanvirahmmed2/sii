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

const ClubCard = ({ club, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!club) return null;

  const { id, name, slug, motto, description, image } = club;
  const cleanDescription = stripHtml(description);
  const targetUrl = tenantUrl(`/clubs/${slug || id}`);

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Link
        href={targetUrl}
        className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors duration-200 flex flex-col justify-between overflow-hidden group h-full ${className}`}
      >
      <div>
        {image ? (
          <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            <Image
              src={image}
              alt={name}
              width={500}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={image.startsWith('http')}
            />
          </div>
        ) : (
          <div className="w-full h-28 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              {name?.slice(0, 3) || 'CLB'}
            </span>
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-1.5">
          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-primary transition-colors">
            {name}
          </h3>

          {motto && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono italic line-clamp-1">
              &ldquo;{motto}&rdquo;
            </p>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
            {cleanDescription || 'Student activity and enrichment organization.'}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-primary">
        <span>Club Activities</span>
        <span className="font-mono text-xs group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
      </div>
      </Link>
    </motion.div>
  );
};

export default ClubCard;

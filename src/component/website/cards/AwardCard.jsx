'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiAward, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const AwardCard = ({ award, recognition, item, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  const data = award || recognition || item;
  if (!data) return null;

  const { name, title, awarded_by, given_by, issuer, year, date, image, image_url, slug, id } = data;
  const cardTitle = title || name || 'Award';
  const coverImage = image_url || image;
  const awardedBy = issuer || awarded_by || given_by || data.awardedBy || data.givenBy;
  const targetSlug = slug || id;
  const targetHref = tenantUrl(href || `/awards/${targetSlug}`);

  const formattedDate = date
    ? new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.22, ease: 'easeOut' } }}
      className="h-full"
    >
      <Link
        href={targetHref}
        className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col justify-between overflow-hidden h-full ${className}`}
      >
        <div className="flex-1 flex flex-col">
          {/* Trophy / Certificate Image Banner */}
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-800/80 dark:to-slate-900 relative overflow-hidden flex items-center justify-center p-3 border-b border-slate-100 dark:border-slate-800/80">
            {coverImage ? (
              <Image
                src={coverImage}
                alt={cardTitle}
                width={480}
                height={360}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                unoptimized={coverImage.startsWith('http')}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <FiAward className="text-2xl" />
                </div>
                <span className="text-[11px] font-medium tracking-wide">Honors &amp; Distinction</span>
              </div>
            )}

            {/* Year Pill overlay */}
            {year && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
                <FiCalendar className="text-[10px] text-primary" />
                <span>{year}</span>
              </div>
            )}
          </div>

          {/* Details Body */}
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
                  <FiAward className="text-[11px]" />
                  <span>Award</span>
                </span>
                {formattedDate && !year && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {formattedDate}
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-2 pt-0.5 leading-snug">
                {cardTitle}
              </h3>
            </div>

            {awardedBy && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate pt-1 border-t border-slate-100/80 dark:border-slate-800/60">
                <span className="text-slate-400 dark:text-slate-500 font-normal">Conferred by:</span>{' '}
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{awardedBy}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs font-semibold text-primary group-hover:bg-primary/5 transition-colors">
          <span>View Award Citation</span>
          <FiArrowRight className="text-xs group-hover:translate-x-1 transition-transform duration-200" />
        </div>
      </Link>
    </motion.div>
  );
};

export default AwardCard;

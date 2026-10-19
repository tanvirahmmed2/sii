'use client';

import Link from 'next/link';
import React from 'react';
import { motion } from 'framer-motion';

const NoticeCard = ({ notice, className = '' }) => {
  if (!notice) return null;

  const { title, link, is_pinned, created_at, category } = notice;
  const noticeDate = created_at ? new Date(created_at) : null;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs hover:shadow-md hover:border-primary/40 transition-colors duration-200 group ${
        is_pinned
          ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
          : 'border-slate-200 dark:border-slate-800'
      } ${className}`}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {is_pinned && (
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider shrink-0">
              Pinned
            </span>
          )}
          {category && (
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase tracking-wider shrink-0">
              {category}
            </span>
          )}
          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>

        {noticeDate && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Published: {noticeDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </span>
        )}
      </div>

      {link && (
        <Link
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-primary/20 transition-all duration-200 shrink-0"
        >
          View Notice
        </Link>
      )}
    </motion.div>
  );
};

export default NoticeCard;

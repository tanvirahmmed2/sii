'use client';

import Link from 'next/link';
import React from 'react';

const NoticeCard = ({ notice, className = '' }) => {
  if (!notice) return null;

  const { title, link, is_pinned, created_at, category } = notice;
  const noticeDate = created_at ? new Date(created_at) : null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded border p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${
        is_pinned
          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      } ${className}`}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {is_pinned && (
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
              Pinned
            </span>
          )}
          {category && (
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shrink-0">
              {category}
            </span>
          )}
          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
            {title}
          </h3>
        </div>

        {noticeDate && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Published: {noticeDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </span>
        )}
      </div>

      {link && (
        <Link
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors shrink-0"
        >
          View Notice
        </Link>
      )}
    </div>
  );
};

export default NoticeCard;

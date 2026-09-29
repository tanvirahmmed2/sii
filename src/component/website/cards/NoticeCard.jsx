'use client';

import Link from 'next/link';
import React from 'react';
import { FiBookOpen, FiInfo, FiExternalLink } from 'react-icons/fi';

const NoticeCard = ({ notice, className = '' }) => {
  if (!notice) return null;

  const { title, link, is_pinned, created_at } = notice;
  const noticeDate = created_at ? new Date(created_at) : null;

  return (
    <div
      className={`bg-white rounded-2xl border p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-200 ${
        is_pinned
          ? 'border-primary-light shadow-xs bg-primary-light/40 hover:border-primary'
          : 'border-slate-100 hover:border-primary hover:shadow-xs'
      } ${className}`}
    >
      <div className="flex gap-3.5 items-start">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            is_pinned
              ? 'bg-primary text-secondary border border-primary-light'
              : 'bg-primary-light text-secondary border border-tertiary'
          }`}
        >
          {is_pinned ? <FiInfo className="text-lg" /> : <FiBookOpen className="text-lg" />}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-sm md:text-base leading-snug">
              {title}
            </h3>
            {is_pinned && (
              <span className="text-[9px] font-semibold text-primary bg-primary-light border border-primary-light px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                Pinned
              </span>
            )}
          </div>
          {noticeDate && (
            <span className="text-[10px] font-bold text-slate-400">
              {noticeDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
          )}
        </div>
      </div>

      {link && (
        <Link
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
            is_pinned
              ? 'bg-primary hover:bg-primary-dark text-secondary shadow-xs'
              : 'bg-primary text-secondary border border-tertiary'
          }`}
        >
          <span>View Document</span>
          <FiExternalLink className="text-xs" />
        </Link>
      )}
    </div>
  );
};

export default NoticeCard;

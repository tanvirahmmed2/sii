'use client';

import React from 'react';
import { FiFileText, FiCalendar, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

const NewsCard = ({ news, href, className = '' }) => {
  if (!news) return null;

  const { title, content, image, created_at } = news;
  const newsDate = created_at ? new Date(created_at) : null;

  const card = (
    <div
      className={`bg-white rounded-2xl border border-primary overflow-hidden hover:shadow-md transition-all duration-250 flex flex-col group h-full ${className}`}
    >
      {image ? (
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
          <Image width={500} height={500}
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-primary-light flex items-center justify-center shrink-0 relative">
          <FiFileText className="text-5xl text-primary opacity-60" />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {newsDate && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <FiCalendar className="text-xs shrink-0 text-primary" />
            <span>{newsDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
          </div>
        )}

        <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-tertiary transition-colors">
          {title}
        </h3>

        <p className="text-slate-500 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap flex-1">
          {content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}
        </p>

        <div className="pt-2 border-t border-slate-50 flex items-center gap-1 text-xs font-bold text-primary group-hover:text-tertiary">
          <span>Read Article</span>
          <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );

  const targetHref = href || `/news/${news.slug || news.id}`;

  return (
    <Link href={targetHref} className="block h-full">
      {card}
    </Link>
  );
};

export default NewsCard;

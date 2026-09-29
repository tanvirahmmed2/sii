'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiCalendar, FiArrowRight, FiActivity, FiUsers } from 'react-icons/fi';

const ClubNewsCard = ({ clubNews, href, className = '' }) => {
  if (!clubNews) return null;

  const { title, content, summary, image_url, club_name, created_at, slug, id } = clubNews;
  const newsDate = created_at ? new Date(created_at) : null;
  const targetHref = href || `/club-news/${slug || id}`;

  const excerpt = summary || (content ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');

  return (
    <Link href={targetHref} className="block h-full group">
      <div
        className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:border-primary hover:shadow-md transition-all duration-300 flex flex-col h-full ${className}`}
      >
        <div className="w-full bg-slate-100 relative shrink-0 overflow-hidden">
          {image_url ? (
            <Image
              width={500}
              height={300}
              src={image_url}
              alt={title || 'Club News'}
              className="w-full h-full object-cover aspect-video transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-primary-light flex items-center justify-center text-primary/70">
              <FiActivity className="text-4xl" />
            </div>
          )}

          {/* Club Name Badge */}
          {club_name && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1.5">
              <FiUsers className="text-xs text-primary" />
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                {club_name}
              </span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-2">
            {/* Date Tag */}
            {newsDate && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <FiCalendar className="text-xs text-primary shrink-0" />
                <span>{newsDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>
            )}

            {/* Title */}
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>

            {/* Content Excerpt */}
            {excerpt && (
              <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">
                {excerpt}
              </p>
            )}
          </div>

          {/* Card Footer Link */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-primary group-hover:text-primary">
            <span>Read News</span>
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ClubNewsCard;

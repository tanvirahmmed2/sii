'use client';

import React from 'react';
import Link from 'next/link';
import { FiAward, FiStar, FiArrowRight } from 'react-icons/fi';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const AchievementCard = ({ achievement, href, className = '' }) => {
  if (!achievement) return null;

  const { title, description, image_url, image } = achievement;
  const coverImage = image_url || image;
  const cleanDescription = stripHtml(description);
  const targetHref = href || `/achievements/${achievement.slug || achievement.id}`;

  return (
    <Link href={targetHref} className="block h-full">
      <div
        className={`bg-white rounded-3xl border border-slate-100 overflow-hidden flex flex-col hover:border-primary hover:shadow-md transition-all duration-250 group h-full ${className}`}
      >
        {coverImage ? (
          <div className="w-full h-48 bg-slate-100 overflow-hidden relative">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="w-full h-36 bg-primary-light flex items-center justify-center relative">
            <div className="w-16 h-16 rounded-2xl bg-white border border-primary-border flex items-center justify-center text-primary text-3xl group-hover:scale-110 transition-transform duration-300 shadow-xs">
              <FiAward />
            </div>
          </div>
        )}

        <div className="p-6 flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
            <FiAward className="text-sm shrink-0" />
            <span>Campus Milestone</span>
          </div>

          <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-primary transition-colors">
            {title}
          </h3>

          <p className="text-slate-500 text-xs md:text-sm leading-relaxed mt-1 line-clamp-4 flex-1">
            {cleanDescription}
          </p>

          <div className="pt-3 border-t border-slate-50 flex items-center gap-1 text-xs font-bold text-primary group-hover:text-primary mt-auto">
            <span>View Milestone</span>
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AchievementCard;

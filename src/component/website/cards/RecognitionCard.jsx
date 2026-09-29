'use client';

import React from 'react';
import Link from 'next/link';
import { FiAward, FiCalendar, FiUser, FiArrowRight } from 'react-icons/fi';
import Image from 'next/image';

const RecognitionCard = ({ recognition, item, href, className = '' }) => {
  const data = recognition || item;
  if (!data) return null;

  const { name, title, awarded_by, given_by, date, image, image_url, slug, id } = data;
  const cardTitle = name || title || 'Recognition';
  const coverImage = image || image_url;
  const awardedBy = awarded_by || given_by || data.awardedBy || data.givenBy;
  const targetSlug = slug || id;
  const targetHref = href || `/recognitions/${targetSlug}`;

  const formattedDate = date
    ? new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Link href={targetHref} className="block group h-full w-full max-w-60 shadow-sm bg-white border border-primary-light rounded-2xl overflow-hidden">
      <div
        className={` items-center  justify-center transition-all duration-300 flex flex-col h-full ${className}`}
      >
        <div className="w-full aspect-square  overflow-hidden bg-white relative shrink-0">
          {coverImage ? (
            <Image width={500} height={500}
              src={coverImage}
              alt={cardTitle}
              className="w-full h-full object-contain transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-primary-light flex flex-col items-center justify-center gap-1.5 p-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-primary-light flex items-center justify-center text-primary text-lg group-hover:scale-110 transition-transform duration-300">
                <FiAward />
              </div>
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                Honour &amp; Award
              </span>
            </div>
          )}

        </div>

        <div className="p-4 flex flex-col items-center justify-center flex-1 gap-1.5">
          
          <h3 className="font-semibold text-slate-900 text-center leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {cardTitle}
          </h3>

          

        </div>
      </div>
    </Link>
  );
};

export default RecognitionCard;

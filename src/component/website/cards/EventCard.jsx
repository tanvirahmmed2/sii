'use client';

import React from 'react';
import { FiCalendar, FiMapPin, FiClock, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

const EventCard = ({ event, href, className = '' }) => {
  if (!event) return null;

  const { id, slug, title, description, event_date, location, image } = event;

  const parseDate = (d) => {
    if (!d) return null;
    let date = new Date(d);
    if (isNaN(date.getTime()) && typeof d === 'string') {
      date = new Date(d.replace(' ', 'T'));
    }
    return isNaN(date.getTime()) ? null : date;
  };

  const dateObj = parseDate(event_date);
  const day = dateObj ? dateObj.getUTCDate() : '';
  const month = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) : '';
  const time = dateObj
    ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
    : '';

  const targetHref = href || `/events/${slug || id}`;

  const card = (
    <div
      className={`bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md hover:border-primary transition-all duration-250 flex flex-col group h-full ${className}`}
    >
      {image ? (
        <div className="w-full aspect-video rounded-xl object-cover overflow-hidden bg-slate-100 shrink-0 relative">
          <Image width={500} height={500}
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {dateObj && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-tertiary-light text-primary px-2.5 py-1 rounded-xl flex flex-col items-center justify-center font-bold text-xs shadow-xs">
              <span className="text-sm font-semibold leading-none">{day}</span>
              <span className="text-[9px] uppercase tracking-wider">{month}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full sm:w-40 bg-primary-light flex sm:flex-col items-center justify-center p-4 shrink-0 relative border-b sm:border-b-0 sm:border-r border-slate-100">
          <div className="w-14 h-14 bg-white border border-tertiary-light text-primary rounded-2xl flex flex-col items-center justify-center shadow-xs">
            <span className="text-lg font-semibold leading-none">{day}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">{month}</span>
          </div>
        </div>
      )}

      <div className="p-5 flex flex-col justify-between gap-3 flex-1">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {time && (
              <span className="flex items-center gap-1">
                <FiClock className="text-xs text-primary shrink-0" />
                {time}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <FiMapPin className="text-xs text-primary shrink-0" />
                {location}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-tertiary transition-colors">
            {title}
          </h3>

          {description && (
            <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-50 flex items-center gap-1 text-xs font-bold text-primary group-hover:text-tertiary">
          <span>View Details</span>
          <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );

  return (
    <Link href={targetHref} className="block h-full">
      {card}
    </Link>
  );
};

export default EventCard;

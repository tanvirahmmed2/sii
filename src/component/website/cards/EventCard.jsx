'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const EventCard = ({ event, href, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
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

  const targetHref = tenantUrl(href || `/events/${slug || id}`);

  return (
    <Link
      href={targetHref}
      className={`group bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col overflow-hidden h-full ${className}`}
    >
      {image && (
        <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
          <Image
            src={image}
            alt={title}
            width={500}
            height={300}
            className="w-full h-full object-cover"
            unoptimized={image.startsWith('http')}
          />
        </div>
      )}

      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {dateObj && (
              <span className="px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                {month} {day} {time && `• ${time}`}
              </span>
            )}
            {location && <span className="truncate">Loc: {location}</span>}
          </div>

          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug group-hover:underline line-clamp-2">
            {title}
          </h3>

          {description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          <span>Event Details</span>
          <span className="font-mono text-[10px] text-slate-400">View &rarr;</span>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;

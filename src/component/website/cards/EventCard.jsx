'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiMapPin, FiClock, FiStar, FiUsers, FiArrowRight } from 'react-icons/fi';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const EventCard = ({ event, href, className = '', onInterestChange }) => {
  const { tenantUrl, getApiEndpoint } = useTenantWebsite();

  const [isInterested, setIsInterested] = useState(Boolean(event?.is_interested));
  const [interestedCount, setInterestedCount] = useState(parseInt(event?.interested_count, 10) || 0);
  const [interestLoading, setInterestLoading] = useState(false);

  if (!event) return null;

  const { id, slug, title, description, event_date, location, image, is_applicable } = event;

  const parseDate = (d) => {
    if (!d) return null;
    let date = new Date(d);
    if (isNaN(date.getTime()) && typeof d === 'string') {
      date = new Date(d.replace(' ', 'T'));
    }
    return isNaN(date.getTime()) ? null : date;
  };

  const dateObj = parseDate(event_date);
  const day = dateObj ? dateObj.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }) : '';
  const month = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase() : '';
  const year = dateObj ? dateObj.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' }) : '';
  const time = dateObj
    ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
    : '';

  const targetHref = tenantUrl(href || `/events/${slug || id}`);

  const handleInterestToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (interestLoading) return;
    setInterestLoading(true);

    try {
      const res = await axios.post(getApiEndpoint('home/events'), {
        event_id: id,
        action: isInterested ? 'uninterest' : 'interest',
      });

      if (res.data?.success) {
        const nextInterested = Boolean(res.data.is_interested);
        const nextCount = parseInt(res.data.interested_count, 10) || 0;
        setIsInterested(nextInterested);
        setInterestedCount(nextCount);
        toast.success(res.data.message || (nextInterested ? 'Marked as interested!' : 'Interest removed.'));
        if (onInterestChange) {
          onInterestChange(id, nextInterested, nextCount);
        }
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.data?.requireAuth) {
        toast.error('Please sign in to your student account to mark your interest.', {
          icon: '🎓',
          duration: 4000,
        });
      } else {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update interest.');
      }
    } finally {
      setInterestLoading(false);
    }
  };

  return (
    <div
      className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-300 flex flex-col overflow-hidden h-full ${className}`}
    >
      {/* Poster Image or Banner */}
      <Link href={targetHref} className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/30 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 overflow-hidden block">
        {image ? (
          <Image
            src={image}
            alt={title}
            width={600}
            height={340}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized={image.startsWith('http')}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800/80">
            <FiCalendar className="text-4xl text-emerald-500/50 mb-1" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Campus Event</span>
          </div>
        )}

        {/* Date badge in corner */}
        {dateObj && (
          <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-2 shadow-md border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center min-w-[50px] leading-tight">
            <span className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400">{month}</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">{day}</span>
          </div>
        )}

        {/* Status Pill */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {is_applicable ? (
            <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
              Open for RSVP
            </span>
          ) : (
            <span className="bg-slate-900/80 backdrop-blur-xs text-slate-200 text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/20">
              Info Only
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-3">
        <div className="space-y-2">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {time && (
              <span className="flex items-center gap-1">
                <FiClock className="text-emerald-500 text-xs" />
                <span>{time}</span>
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1 truncate max-w-[180px]">
                <FiMapPin className="text-emerald-500 text-xs shrink-0" />
                <span className="truncate">{location}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={targetHref} className="block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
              {title}
            </h3>
          </Link>

          {/* Description */}
          {description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Interested Counter & Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-auto">
          {/* Students Interested Count */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 text-xs">
              <FiStar className={isInterested ? 'fill-amber-400' : ''} />
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200">
              {interestedCount} <span className="font-normal text-slate-500 dark:text-slate-400">interested</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Interactive Interested Toggle Button */}
            <button
              type="button"
              onClick={handleInterestToggle}
              disabled={interestLoading}
              title={isInterested ? 'Remove from interested' : 'Click to show student interest'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                isInterested
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 border border-transparent'
              } disabled:opacity-50`}
            >
              <FiStar className={`text-xs ${isInterested ? 'fill-current' : ''}`} />
              <span>{isInterested ? 'Interested' : 'Interest'}</span>
            </button>

            {/* View Details Link */}
            <Link
              href={targetHref}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white text-slate-500 dark:text-slate-400 transition-colors"
              title="View full event details"
            >
              <FiArrowRight className="text-xs" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;

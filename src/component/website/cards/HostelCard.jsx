'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const HostelCard = ({ hostel, className = '', showApply = true }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!hostel) return null;

  const {
    id,
    name,
    slug,
    description,
    total_room,
    location,
    gender,
    image,
    total_seats,
    allocated_seats,
  } = hostel;

  const seatsLeft = Math.max(0, (total_seats || 0) - (allocated_seats || 0));
  const targetUrl = tenantUrl(`/facilities/hostels/${slug || id}`);
  const applyUrl = tenantUrl(`/facilities/hostels/apply?hostel_id=${id}`);

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between gap-3 group transition-colors ${className}`}
    >
      <div className="space-y-3">
        {image && (
          <div className="w-full aspect-[16/9] rounded overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
            <Image
              src={image}
              alt={name || 'Hostel'}
              width={500}
              height={300}
              className="w-full h-full object-cover"
              unoptimized={image.startsWith('http')}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
            {name}
          </h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
            {gender ? `${gender} Residence` : 'Co-ed Hall'}
          </span>
        </div>

        {location && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Campus Wing: {location}
          </p>
        )}

        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">
              Total Rooms
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {total_room || 0} Rooms
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">
              Available Seats
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {seatsLeft} / {total_seats || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Link
          href={targetUrl}
          className="flex-1 text-center px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Hall Details
        </Link>
        {showApply && (
          <Link
            href={applyUrl}
            className="flex-1 text-center px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition-colors"
          >
            Apply Seat
          </Link>
        )}
      </div>
    </div>
  );
};

export { HostelCard, HostelCard as HostelsCard };
export default HostelCard;

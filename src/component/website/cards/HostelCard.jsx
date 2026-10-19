'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 transition-colors duration-200 group ${className}`}
    >
      <div className="space-y-3.5">
        {image && (
          <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
            <Image
              src={image}
              alt={name || 'Hostel'}
              width={500}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={image.startsWith('http')}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-primary transition-colors">
            {name}
          </h3>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
            {gender ? `${gender} Residence` : 'Co-ed Hall'}
          </span>
        </div>

        {location && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            Campus Wing: {location}
          </p>
        )}

        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">
              Total Rooms
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {total_room || 0} Rooms
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">
              Available Seats
            </span>
            <span className="font-semibold text-primary">
              {seatsLeft} / {total_seats || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Link
          href={targetUrl}
          className="flex-1 text-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors"
        >
          Hall Details
        </Link>
        {showApply && (
          <Link
            href={applyUrl}
            className="flex-1 text-center px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-xs hover:shadow-md hover:shadow-primary/20 transition-all duration-200"
          >
            Apply Seat
          </Link>
        )}
      </div>
    </motion.div>
  );
};

export { HostelCard, HostelCard as HostelsCard };
export default HostelCard;

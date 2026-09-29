'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiHome, FiMapPin, FiLayers, FiCheckCircle, FiArrowRight } from 'react-icons/fi';

const HostelCard = ({ hostel, className = '', showApply = true }) => {
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
    allocated_seats
  } = hostel;

  const genderTagClass = 
    gender === 'Male'
      ? 'bg-sky-100 text-sky-800 border-sky-200'
      : gender === 'Female'
      ? 'bg-pink-100 text-pink-800 border-pink-200'
      : 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className={`bg-white border border-slate-100 hover:border-primary rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-5 group ${className}`}>
      
      {/* Top Banner Image or Icon Placeholder */}
      <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-50 relative shrink-0 border border-slate-100">
        {image ? (
          <Image
            src={image}
            alt={name || 'Hostel Banner'}
            width={600}
            height={300}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-sky-50 flex items-center justify-center text-primary">
            <FiHome className="text-5xl opacity-40 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}

        {/* Gender Badge on top of image */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full border shadow-xs tracking-wider ${genderTagClass}`}>
            {gender ? `${gender} Hall` : 'Co-ed / Both'}
          </span>
        </div>
      </div>

      {/* Hostel Body Info */}
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors leading-snug">
            {name}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1">
            <FiMapPin className="text-primary" /> {location || 'Campus Main Block'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <FiLayers className="text-slate-400" /> {total_room || 0} Rooms
          </span>
        </div>

        {/* Description Rich HTML or text */}
        {description && (
          <div 
            className="text-slate-600 text-xs leading-relaxed line-clamp-3 mt-1 prose prose-sm max-w-none text-slate-500"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
      </div>

      {/* Footer Info & Application Link */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <FiCheckCircle className="text-emerald-500 text-sm" />
          <span>Active Residential Hall</span>
        </div>

        {showApply && (
          <Link
            href="/student/hostels"
            className="px-4 py-2 bg-primary-light hover:bg-primary text-primary hover:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Apply for Seat</span>
            <FiArrowRight className="text-xs" />
          </Link>
        )}
      </div>

    </div>
  );
};

// Export as both HostelCard and HostelsCard for convenience
export const HostelsCard = HostelCard;
export default HostelCard;

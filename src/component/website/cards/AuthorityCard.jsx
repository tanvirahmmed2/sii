'use client';

import React from 'react';
import Link from 'next/link';
import { FiUser, FiMail, FiPhone, FiChevronRight, FiAward, FiBriefcase } from 'react-icons/fi';
import Image from 'next/image';

const AuthorityCard = ({ authority, className = '', isRole = false }) => {
  if (!authority) return null;

  const {
    title,
    name,
    href,
    image,
    designation,
    designation_title,
    icon: CustomIcon
  } = authority;

  const isRoleCard = isRole || Boolean(href && !name && title);
  const displayName = name || title || 'Board Member';
  const displayDesignation = designation_title || designation;

  if (isRoleCard) {
    return (
      <Link href={href || `/authorities/${authority.slug || ''}`} className="block group">
        <div
          className={`bg-white rounded-2xl border border-slate-100 hover:border-primary shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col sm:flex-row p-6 gap-5 ${className}`}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-light border border-primary-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            {CustomIcon ? (
              <CustomIcon className="text-primary text-2xl sm:text-3xl" />
            ) : (
              <FiBriefcase className="text-primary text-2xl sm:text-3xl" />
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900 text-base sm:text-lg group-hover:text-primary transition-colors leading-tight">
                {title || name}
              </h3>
            </div>

            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-2">
              {displayDesignation}
            </p>
          </div>

          <div className="self-center hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-slate-50 group-hover:bg-primary-light text-slate-400 group-hover:text-primary transition-all">
            <FiChevronRight className="text-lg group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    );
  }

  const viewHref = authority.id ? `/authorities/view?id=${authority.id}` : '#';

  return (
    <Link href={viewHref}
        className={`bg-white w-80 rounded-xl border border-slate-100 hover:border-primary hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col p-3 gap-6 ${className}`}
      >
        <div className="w-full aspect-square flex items-center justify-center shrink-0 overflow-hidden relative shadow-xs">
          {image ? (
            <Image
              width={500}
              height={500}
              src={image}
              alt={displayName}
              className="w-full h-full object-cover aspect-square transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-primary py-8">
              <FiUser className="text-4xl" />
            </div>
          )}
        </div>

        <div className="w-full flex flex-col justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-lg sm:text-xl group-hover:text-primary transition-colors leading-snug">
                {displayName}
              </h3>
            </div>

            {displayDesignation && (
              <p className="text-primary text-xs sm:text-sm leading-relaxed mt-1 line-clamp-3">
                {displayDesignation}
              </p>
            )}
          </div>
        </div>
      </Link>
  );
};

export default AuthorityCard;

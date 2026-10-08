'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const AuthorityCard = ({ authority, className = '', isRole = false }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!authority) return null;

  const {
    title,
    name,
    href,
    image,
    designation,
    designation_title,
  } = authority;

  const isRoleCard = isRole || Boolean(href && !name && title);
  const displayName = name || title || 'Board Member';
  const displayDesignation = designation_title || designation || 'Institutional Executive';

  if (isRoleCard) {
    const roleHref = tenantUrl(href || `/authorities/${authority.slug || ''}`);
    return (
      <Link href={roleHref} className="block group">
        <div
          className={`bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors p-3.5 flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex flex-col min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:underline truncate">
              {title || name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {displayDesignation}
            </p>
          </div>
          <span className="font-mono text-[10px] text-slate-400 shrink-0">&rarr;</span>
        </div>
      </Link>
    );
  }

  const viewHref = tenantUrl(authority.slug ? `/authorities/${authority.slug}` : `/authorities/view?id=${authority.id}`);

  return (
    <Link
      href={viewHref}
      className={`group bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col overflow-hidden ${className}`}
    >
      <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
        {image ? (
          <Image
            src={image}
            alt={displayName}
            width={400}
            height={400}
            className="w-full h-full object-cover"
            unoptimized={image.startsWith('http')}
          />
        ) : (
          <div className="w-12 h-12 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold flex items-center justify-center">
            {displayName.charAt(0)}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 text-center items-center">
        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate w-full group-hover:underline">
          {displayName}
        </h4>
        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 uppercase tracking-wider truncate max-w-full">
          {displayDesignation}
        </span>
      </div>
    </Link>
  );
};

export default AuthorityCard;

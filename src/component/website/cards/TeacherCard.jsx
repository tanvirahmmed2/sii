'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

const TeacherCard = ({ teacher, className = '' }) => {
  const { tenantUrl } = useTenantWebsite();
  if (!teacher) return null;

  const targetUrl = tenantUrl(`/teachers/${teacher.username || teacher.id}`);

  return (
    <Link
      href={targetUrl}
      className={`group bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex flex-col overflow-hidden ${className}`}
    >
      <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
        {teacher.image ? (
          <Image
            src={teacher.image}
            alt={teacher.name}
            width={400}
            height={400}
            className="w-full h-full object-cover"
            unoptimized={teacher.image.startsWith('http')}
          />
        ) : (
          <div className="w-12 h-12 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold flex items-center justify-center">
            {teacher.name?.charAt(0) || 'F'}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 text-center items-center">
        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate w-full group-hover:underline">
          {teacher.name}
        </h4>
        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 uppercase tracking-wider truncate max-w-full">
          {teacher.designation || 'Faculty Member'}
        </span>
        {teacher.email && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-full">
            {teacher.email}
          </span>
        )}
      </div>
    </Link>
  );
};

export default TeacherCard;

'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiEye, FiDownload, FiCalendar, FiFileText } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { getDriveDetails, triggerDriveDownload } from 'src/lib/utils/drive';

const NoticeCard = ({ notice, className = '' }) => {
  const { tenantUrl } = useContext(TenantWebsiteContext) || {};

  if (!notice) return null;

  const {
    id,
    title,
    slug,
    drive_url,
    link,
    description,
    is_pinned,
    created_at,
    published_date,
    category,
  } = notice;

  const effectiveDriveUrl = drive_url || link || '';
  const effectiveSlug = slug || id;
  const noticeUrl = tenantUrl ? tenantUrl(`/notices/${effectiveSlug}`) : `/notices/${effectiveSlug}`;

  const dateValue = published_date || created_at;
  const noticeDate = dateValue ? new Date(dateValue) : null;

  const driveDetails = effectiveDriveUrl ? getDriveDetails(effectiveDriveUrl) : null;
  const downloadUrl = driveDetails?.downloadUrl || effectiveDriveUrl;

  // Clean plain text preview of description
  const cleanSnippet = description
    ? description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (effectiveDriveUrl) {
      triggerDriveDownload(effectiveDriveUrl, `${slug || 'notice'}.pdf`);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs hover:shadow-md hover:border-primary/40 ${
        is_pinned
          ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
          : 'border-slate-200/80 dark:border-slate-800/80'
      } ${className}`}
    >
      {/* Notice info */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          <FiFileText className="w-5 h-5" />
        </div>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {is_pinned && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/15 text-primary border-primary/30 uppercase tracking-wider shrink-0">
                Pinned
              </span>
            )}
            {category && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 uppercase tracking-wider shrink-0">
                {category}
              </span>
            )}
            {noticeDate && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <FiCalendar className="w-3 h-3 text-slate-400" />
                {noticeDate.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>

          <Link href={noticeUrl} className="block group/link">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base leading-snug group-hover/link:text-primary transition-colors">
              {title}
            </h3>
          </Link>

          {cleanSnippet && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed font-light mt-0.5">
              {cleanSnippet}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons: View and Download */}
      <div className="flex items-center gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80 w-full md:w-auto justify-end">
        {/* View button */}
        <Link
          href={noticeUrl}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 shadow-2xs"
          title="View notice details & document"
        >
          <FiEye className="w-3.5 h-3.5" />
          <span>View</span>
        </Link>

        {/* Download button */}
        {effectiveDriveUrl ? (
          <a
            href={downloadUrl}
            download={`${slug || 'notice'}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDownloadClick}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-dark text-white transition-all duration-200 shadow-xs hover:shadow-md hover:shadow-primary/20 shrink-0 cursor-pointer"
            title="Download drive document"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
            title="No document file attached"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default NoticeCard;

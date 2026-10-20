'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiCalendar,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiShare2,
  FiMaximize2,
  FiMinimize2,
  FiCheck,
  FiInfo,
} from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';
import { getDriveDetails, triggerDriveDownload } from 'src/lib/utils/drive';
import NoticeCard from 'src/component/website/cards/NoticeCard';

const NoticeDetailPage = () => {
  const params = useParams();
  const slug = params?.slug;
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext) || {};

  const [notice, setNotice] = useState(null);
  const [recentNotices, setRecentNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchNoticeData = async () => {
      setLoading(true);
      try {
        const [singleRes, listRes] = await Promise.all([
          fetch(getApiEndpoint(`notices/${encodeURIComponent(slug)}`)),
          fetch(getApiEndpoint('notices')),
        ]);

        if (singleRes.ok) {
          const data = await singleRes.json();
          const item = data.payload?.notice || data.paylod?.notice || data.notice;
          setNotice(item || null);
        } else {
          setNotice(null);
        }

        if (listRes.ok) {
          const listData = await listRes.json();
          const allNotices =
            listData.payload?.notices || listData.paylod?.notices || listData.notices || [];
          setRecentNotices(
            allNotices
              .filter((n) => n.slug !== slug && String(n.id) !== String(slug))
              .slice(0, 3)
          );
        }
      } catch (err) {
        console.error('Failed to fetch notice details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNoticeData();
  }, [slug, getApiEndpoint]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const effectiveDriveUrl = notice?.drive_url || notice?.link || '';
  const driveDetails = effectiveDriveUrl ? getDriveDetails(effectiveDriveUrl) : null;
  const downloadUrl = driveDetails?.downloadUrl || effectiveDriveUrl;
  const viewUrl = driveDetails?.viewUrl || effectiveDriveUrl;

  const handleDownload = (e) => {
    e?.preventDefault();
    if (effectiveDriveUrl) {
      triggerDriveDownload(effectiveDriveUrl, `${notice?.slug || 'notice'}.pdf`);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 py-16 px-4 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
          Loading notice document...
        </p>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="w-full min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 py-16 px-4 sm:px-6">
        <div className="max-w-md mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <FiFileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-serif font-medium text-slate-900 dark:text-slate-100">
            Notice Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
            The notice or circular you are requesting does not exist, has expired, or was archived.
          </p>
          <Link
            href={tenantUrl ? tenantUrl('/notices') : '/notices'}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Return to Notices Bulletin</span>
          </Link>
        </div>
      </div>
    );
  }

  const dateValue = notice.published_date || notice.created_at;
  const noticeDate = dateValue ? new Date(dateValue) : null;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={tenantUrl ? tenantUrl('/notices') : '/notices'}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors shadow-2xs self-start"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to All Notices</span>
          </Link>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors shadow-2xs cursor-pointer"
              title="Copy link to clipboard"
            >
              {copied ? (
                <>
                  <FiCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <FiShare2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>

            {effectiveDriveUrl && (
              <>
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors shadow-2xs"
                  title="Open in Google Drive / external tab"
                >
                  <FiExternalLink className="w-3.5 h-3.5" />
                  <span>Open Drive</span>
                </a>

                <a
                  href={downloadUrl}
                  download={`${notice.slug || 'notice'}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-dark text-white shadow-xs hover:shadow-md hover:shadow-primary/20 transition-all cursor-pointer"
                  title="Download attached document"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Notice Header Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
              <FiFileText className="w-3 h-3" />
              Official Circular
            </span>
            {noticeDate && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                Published:{' '}
                {noticeDate.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
            {notice.title}
          </h1>

          {notice.description && (
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
              <div
                dangerouslySetInnerHTML={{ __html: notice.description }}
                className="prose dark:prose-invert max-w-none"
              />
            </div>
          )}
        </motion.div>

        {/* DRIVE DATA VIEWER SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`space-y-3 ${
            isFullscreen
              ? 'fixed inset-0 z-50 bg-slate-950/95 p-4 sm:p-6 flex flex-col'
              : ''
          }`}
        >
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Document Viewer
              </span>
              {driveDetails?.isGoogleDrive && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Google Drive
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary transition shadow-2xs cursor-pointer"
                title={isFullscreen ? 'Exit full screen' : 'Full screen viewer'}
              >
                {isFullscreen ? (
                  <>
                    <FiMinimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <FiMaximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </button>

              {effectiveDriveUrl && (
                <a
                  href={downloadUrl}
                  download={`${notice.slug || 'notice'}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                  title="Download file"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
            </div>
          </div>

          {/* Embedded Viewer Container */}
          <div
            className={`relative w-full rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${
              isFullscreen ? 'flex-1 h-full' : 'h-[620px] sm:h-[820px]'
            }`}
          >
            {effectiveDriveUrl ? (
              <>
                {iframeLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/90 backdrop-blur-2xs gap-3">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Loading document preview...
                    </p>
                  </div>
                )}

                <iframe
                  src={driveDetails?.previewUrl || effectiveDriveUrl}
                  title={notice.title}
                  className="w-full h-full border-0 rounded-2xl"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  onLoad={() => setIframeLoading(false)}
                />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                  <FiInfo className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-base text-slate-800 dark:text-slate-200">
                  No Document Attachment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  This notice contains textual instructions above, and does not have an attached
                  Google Drive file.
                </p>
              </div>
            )}
          </div>

          {/* Viewer helper notice */}
          {effectiveDriveUrl && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Trouble previewing? You can{' '}
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  open directly in Google Drive ↗
                </a>{' '}
                or{' '}
                <a
                  href={downloadUrl}
                  download={`${notice.slug || 'notice'}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDownload}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  download the document file
                </a>
                .
              </span>
            </div>
          )}
        </motion.section>

        {/* Other Recent Notices */}
        {recentNotices.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-medium text-slate-900 dark:text-slate-100">
                Other Recent Notices
              </h2>
              <Link
                href={tenantUrl ? tenantUrl('/notices') : '/notices'}
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                View Bulletin &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {recentNotices.map((recentNotice) => (
                <NoticeCard key={recentNotice.id} notice={recentNotice} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeDetailPage;

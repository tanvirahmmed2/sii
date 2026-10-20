'use client';

import React, { useEffect, useState, use, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FiAward,
  FiCalendar,
  FiArrowLeft,
  FiShare2,
  FiPrinter,
  FiCheckCircle,
  FiShield,
  FiExternalLink,
  FiLayers,
} from 'react-icons/fi';
import AwardCard from 'src/component/website/cards/AwardCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const AwardDetailPage = ({ params: paramsPromise }) => {
  const routeParams = useParams();
  const unwrappedParams = paramsPromise ? use(paramsPromise) : null;
  const slug = unwrappedParams?.slug || routeParams?.slug;

  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);
  const [award, setAward] = useState(null);
  const [relatedAwards, setRelatedAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  useEffect(() => {
    const fetchAwardDetail = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        // Try dedicated single endpoint
        const endpoint = `awards/${encodeURIComponent(slug)}`;
        const res = await fetch(getApiEndpoint(endpoint));

        if (res.ok) {
          const data = await res.json();
          const currentAward = data.payload?.award || data.paylod?.award || data.award || null;
          setAward(currentAward);

          const related =
            data.payload?.relatedAwards ||
            data.paylod?.relatedAwards ||
            data.relatedAwards ||
            [];
          setRelatedAwards(related);
        } else {
          // Fallback: fetch full list and find by slug or ID
          const listRes = await fetch(getApiEndpoint('awards'));
          if (listRes.ok) {
            const listData = await listRes.json();
            const allAwards =
              listData.payload?.awards ||
              listData.paylod?.awards ||
              listData.awards ||
              [];
            const found = allAwards.find(
              (a) => a.slug === slug || String(a.id) === String(slug)
            );
            setAward(found || null);
            if (found) {
              setRelatedAwards(
                allAwards.filter((a) => a.id !== found.id).slice(0, 4)
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch award details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAwardDetail();
  }, [slug, getApiEndpoint]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          toast.success('Award citation link copied to clipboard!', {
            icon: '🏆',
            duration: 3000,
          });
        })
        .catch(() => {
          toast.error('Could not copy link to clipboard.');
        });
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-96 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-40 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!award) {
    return (
      <div className="w-full min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center">
            <FiAward className="text-3xl" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-semibold text-slate-900 dark:text-white">
              Award Citation Not Found
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The requested award or institutional distinction could not be located, or may have been unlisted.
            </p>
          </div>
          <Link
            href={tenantUrl('/awards')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors shadow-xs"
          >
            <FiArrowLeft className="text-sm" />
            <span>Browse All Institutional Awards</span>
          </Link>
        </div>
      </div>
    );
  }

  const coverImage = award.image_url || award.image;
  const schoolName = website?.name || 'Educational Institution';
  const citationDate = award.created_at
    ? new Date(award.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
        {/* Navigation & Breadcrumbs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap">
            <Link
              href={tenantUrl('/')}
              className="hover:text-primary transition-colors font-medium"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href={tenantUrl('/awards')}
              className="hover:text-primary transition-colors font-medium"
            >
              Awards
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-xs sm:max-w-md">
              {award.title}
            </span>
          </div>

          <Link
            href={tenantUrl('/awards')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline shrink-0"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back to All Awards</span>
          </Link>
        </div>

        {/* Hero Showcase Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Trophy / Certificate Visual */}
          {coverImage ? (
            <div className="relative w-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-850 dark:to-slate-950 flex flex-col items-center justify-center p-6 sm:p-10 border-b border-slate-100 dark:border-slate-800/80">
              <div
                className="relative max-w-xl w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-zoom-in group shadow-md bg-white dark:bg-slate-800"
                onClick={() => setIsImageZoomed(true)}
                title="Click to view full image"
              >
                <Image
                  src={coverImage}
                  alt={award.title}
                  width={800}
                  height={600}
                  className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
                  unoptimized={coverImage.startsWith('http')}
                  priority
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-[11px] font-semibold backdrop-blur-md">
                    Click to Zoom
                  </span>
                </div>
              </div>

              {award.caption && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic text-center max-w-lg">
                  {award.caption}
                </p>
              )}
            </div>
          ) : (
            <div className="w-full py-16 bg-gradient-to-br from-primary/5 via-slate-50 to-primary/10 dark:from-primary/10 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center text-center px-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner mb-4">
                <FiAward className="text-4xl" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Official Institutional Citation
              </span>
            </div>
          )}

          {/* Award Header Info */}
          <div className="p-6 sm:p-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                    <FiAward className="text-xs" />
                    <span>Official Award</span>
                  </span>

                  {award.year && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <FiCalendar className="text-xs text-primary" />
                      <span>Year {award.year}</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                    <FiCheckCircle className="text-xs" />
                    <span>Verified Credential</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal text-slate-900 dark:text-white tracking-tight leading-tight">
                  {award.title}
                </h1>

                {award.issuer && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    Conferred by:{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {award.issuer}
                    </span>
                  </p>
                )}
              </div>

              {/* Action Buttons: Share & Print */}
              <div className="flex items-center gap-2 self-start shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Share this award"
                >
                  <FiShare2 className="text-xs" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary hover:border-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Print citation"
                >
                  <FiPrinter className="text-xs" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Citation & Detailed Description */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Award Citation &amp; Statement
              </h2>

              {award.description ? (
                <div
                  className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-4 [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>strong]:text-slate-900 dark:[&>strong]:text-white font-light"
                  dangerouslySetInnerHTML={{ __html: award.description }}
                />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  This official institutional recognition was presented to {schoolName} in commendation of outstanding academic excellence, operational distinction, and student development achievements.
                </p>
              )}
            </div>

            {/* Institutional Verification Box */}
            <div className="bg-slate-50 dark:bg-slate-850/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block">
                  Institution
                </span>
                <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                  {schoolName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block">
                  Conferring Body
                </span>
                <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                  {award.issuer || 'Academic Board'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block">
                  Conferred Year
                </span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono block mt-0.5">
                  {award.year || 'Accredited'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium block">
                  Record Status
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 mt-0.5">
                  <FiShield className="text-xs" />
                  <span>Archived &amp; Verified</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Other / Related Institutional Awards Section */}
        {relatedAwards.length > 0 && (
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                  Explore Accreditations
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-normal text-slate-900 dark:text-white tracking-tight mt-0.5">
                  Other Institutional Awards
                </h2>
              </div>

              <Link
                href={tenantUrl('/awards')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>View All ({relatedAwards.length + 1})</span>
                <span>&rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedAwards.map((item) => (
                <AwardCard key={item.id} award={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {isImageZoomed && coverImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
            onClick={() => setIsImageZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsImageZoomed(false)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white font-bold text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                ✕ Close
              </button>
              <div className="relative w-full max-h-[80vh] flex items-center justify-center">
                <Image
                  src={coverImage}
                  alt={award.title}
                  width={1200}
                  height={900}
                  className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl"
                  unoptimized={coverImage.startsWith('http')}
                />
              </div>
              {award.title && (
                <p className="mt-3 text-sm text-white/90 text-center font-medium">
                  {award.title} {award.year ? `(${award.year})` : ''}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AwardDetailPage;

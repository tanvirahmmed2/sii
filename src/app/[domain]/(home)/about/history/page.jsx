/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { FiAward, FiExternalLink } from 'react-icons/fi';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const HistoryPage = () => {
  const { website, getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [milestones, setMilestones] = useState([]);
  const [legacyHistories, setLegacyHistories] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    try {
      return new Date(dateVal).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateVal);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      try {
        // Fetch new institutional milestones from database
        const milestonePromise = fetch(getApiEndpoint('home/institutional?type=milestones'))
          .then((res) => (res.ok ? res.json() : { milestones: [] }))
          .catch(() => ({ milestones: [] }));

        // Also fetch legacy histories if any
        const historyPromise = fetch(getApiEndpoint('histories'))
          .then((res) => (res.ok ? res.json() : {}))
          .catch(() => ({}));

        const [mRes, hRes] = await Promise.all([milestonePromise, historyPromise]);

        if (!ignore) {
          if (mRes?.milestones && Array.isArray(mRes.milestones)) {
            setMilestones(mRes.milestones);
          }
          const legacyItems =
            hRes?.payload?.histories || hRes?.paylod?.histories || hRes?.histories || [];
          setLegacyHistories(legacyItems);
        }
      } catch (err) {
        console.error('Error fetching history page data:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [getApiEndpoint]);

  const hasAnyItems = milestones.length > 0 || legacyHistories.length > 0;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={tenantUrl('/about')}
              className="text-xs text-primary font-medium hover:underline"
            >
              ← Back to About
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Institutional History & Heritage
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            A chronological timeline of founding events, infrastructural expansions, and academic
            accomplishments of {website?.name || 'our institution'}.
          </p>
        </div>

        {/* Dynamic Rich Text from Website record */}
        {website?.history && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Founding Background
            </h2>
            <div
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: website.history }}
            />
          </div>
        )}

        {/* Timeline Loading / Empty / Content */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 flex justify-center items-center">
            <div className="loader loader-md" />
          </div>
        ) : !hasAnyItems ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Timeline Milestones Documented
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historical milestone records will appear here as they are published by the
              administration.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* New Database Milestones */}
            {milestones.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FiAward className="text-primary w-4 h-4" />
                  <span>Chronological Milestones & Historic Events</span>
                </h2>

                <div className="space-y-4">
                  {milestones.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
                            {m.year}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {m.title}
                          </h3>
                        </div>
                      </div>

                      {/* Attached Cloudinary Image */}
                      {m.image && (
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                          <a
                            href={m.image}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative group max-h-80 overflow-hidden"
                          >
                            <img
                              src={m.image}
                              alt={m.title}
                              className="w-full h-auto max-h-80 object-cover group-hover:scale-102 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs gap-1">
                              <FiExternalLink className="w-3.5 h-3.5" />
                              <span>View Full Image</span>
                            </div>
                          </a>
                        </div>
                      )}

                      {/* Rich Text Description */}
                      {m.description && (
                        <div
                          className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: m.description }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Timeline Records */}
            {legacyHistories.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Archival Records
                </h2>

                <div className="space-y-3">
                  {legacyHistories.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>
                        {item.date && (
                          <span className="text-[11px] font-medium text-primary px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 w-fit">
                            {formatDate(item.date)}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <div
                          className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}

                      {item.infor && item.infor.trim() !== '' && (
                        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300 block mb-0.5">
                            Notes:
                          </span>
                          <span className="whitespace-pre-line">{item.infor}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;

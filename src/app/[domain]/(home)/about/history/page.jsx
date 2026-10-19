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
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={tenantUrl('/about')}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              ← Back to About
            </Link>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white tracking-tight">
            Institutional History & Heritage
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            A chronological timeline of founding events, infrastructural expansions, and academic
            accomplishments of {website?.name || 'our institution'}.
          </p>
        </div>

        {/* Dynamic Rich Text from Website record */}
        {website?.history && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-3">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-16 flex justify-center items-center shadow-xs">
            <div className="loader loader-md" />
          </div>
        ) : !hasAnyItems ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2 shadow-xs">
            <h3 className="font-serif text-base font-semibold text-slate-800 dark:text-slate-200">
              No Timeline Milestones Documented
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historical milestone records will appear here as they are published by the
              administration.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* New Database Milestones */}
            {milestones.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <FiAward className="text-primary w-5 h-5" />
                  <span>Chronological Milestones & Historic Events</span>
                </h2>

                <div className="space-y-6">
                  {milestones.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
                            {m.year}
                          </span>
                          <h3 className="font-serif text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                            {m.title}
                          </h3>
                        </div>
                      </div>

                      {/* Attached Cloudinary Image */}
                      {m.image && (
                        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
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
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs gap-1.5">
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
              <div className="space-y-4 pt-2">
                <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 dark:text-white tracking-tight">
                  Archival Records
                </h2>

                <div className="space-y-4">
                  {legacyHistories.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                        {item.date && (
                          <span className="text-xs font-medium text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                            {formatDate(item.date)}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <div
                          className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}

                      {item.infor && item.infor.trim() !== '' && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
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

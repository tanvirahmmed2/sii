'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const HistoryPage = () => {
  const { website, getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [histories, setHistories] = useState([]);
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
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint('histories'));
        if (res.ok) {
          const data = await res.json();
          setHistories(data.payload?.histories || data.paylod?.histories || data.histories || []);
        }
      } catch (err) {
        console.error('Error fetching history page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getApiEndpoint]);

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
            A chronological timeline of founding events, infrastructural expansions, and academic accomplishments of {website?.name || 'our institution'}.
          </p>
        </div>

        {/* Dynamic Rich Text from Website record */}
        {website?.history && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 sm:p-6 shadow-xs space-y-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Founding Background
            </h2>
            <div 
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: website.history }}
            />
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Loading historical archive records...
            </span>
          </div>
        ) : histories.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Timeline Milestones Documented
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historical milestone records will appear here as they are published by the administration.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Chronological Milestones
            </h2>

            <div className="space-y-3">
              {histories.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs space-y-2"
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
                      <span className="font-medium text-slate-700 dark:text-slate-300 block mb-0.5">Notes:</span>
                      <span className="whitespace-pre-line">{item.infor}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HistoryPage;

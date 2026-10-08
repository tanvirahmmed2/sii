'use client';

import React, { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import RecognitionCard from 'src/component/website/cards/RecognitionCard';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const RecognitionsPage = () => {
  const { getApiEndpoint, tenantUrl, website } = useContext(TenantWebsiteContext);
  const [recognitions, setRecognitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecognitions = async () => {
      try {
        const res = await fetch(getApiEndpoint('recognitions'));
        if (res.ok) {
          const data = await res.json();
          const list = data.paylod?.recognitions || data.payload?.recognitions || data.recognitions || [];
          setRecognitions(list);
        }
      } catch (err) {
        console.error('Error fetching recognitions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecognitions();
  }, [getApiEndpoint]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Institutional Distinctions
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Accreditations & Recognitions
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            National educational board approvals, academic honors, and quality certifications granted to {website?.name || 'our institution'}.
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-8 text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading recognitions record...</span>
          </div>
        ) : recognitions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recognitions.map((item) => (
              <RecognitionCard key={item.id} recognition={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-12 text-center space-y-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Recognitions Documented</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Accreditation certificates will be published here upon archival verification.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default RecognitionsPage;

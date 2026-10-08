'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import RichTextDisplay from 'src/component/helper/RichTextDisplay';
import { TenantWebsiteContext } from 'src/component/helper/WebsiteContext';

const RecognitionDetailPage = () => {
  const { slug } = useParams();
  const { getApiEndpoint, tenantUrl } = useContext(TenantWebsiteContext);
  const [recognition, setRecognition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchRecognition = async () => {
      try {
        const res = await fetch(getApiEndpoint(`recognitions/by-slug/${slug}`));
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setRecognition(data.paylod?.recognition || data.payload?.recognition || null);
        }
      } catch (err) {
        console.error('Error fetching recognition:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRecognition();
  }, [slug, getApiEndpoint]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading distinction details...</span>
      </div>
    );
  }

  if (notFound || !recognition) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center px-4 space-y-3">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recognition Record Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">The distinction may have been removed or the address is invalid.</p>
        <Link
          href={tenantUrl('/recognitions')}
          className="text-xs font-medium text-primary hover:underline"
        >
          ← Back to Recognitions
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link
            href={tenantUrl('/recognitions')}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to Recognitions
          </Link>
        </div>

        <article className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {recognition.image && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 dark:bg-slate-800 relative">
              <Image
                fill
                src={recognition.image}
                alt={recognition.name}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-4">
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-block">
              Institutional Honour
            </span>

            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              {recognition.name}
            </h1>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800 py-2.5">
              <span>Awarded by: <strong className="text-slate-800 dark:text-slate-200 font-medium">{recognition.awarded_by}</strong></span>
              {recognition.date && (
                <span>Date: <strong className="text-slate-800 dark:text-slate-200 font-medium">{new Date(recognition.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
              )}
            </div>

            {recognition.description && (
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-2">
                <RichTextDisplay html={recognition.description} />
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default RecognitionDetailPage;

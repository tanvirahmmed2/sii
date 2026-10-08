'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';

export default function SingleUpdatePage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams?.slug;
  const { website, tenantUrl } = useTenantWebsite();

  const [update, setUpdate] = useState(null);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const fetchUpdate = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/marketing/updates?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.success && data.update) {
          setUpdate(data.update);
          setRecentUpdates(data.recentUpdates || []);
        } else {
          setError(data.error || 'Update not found.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load update.');
      } finally {
        setLoading(false);
      }
    };

    fetchUpdate();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-20">
        <span className="text-xs font-medium text-slate-400">Loading release details...</span>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 text-center space-y-3 shadow-xs">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
            [Release Unavailable]
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Release Notes Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error || 'The requested changelog announcement could not be located.'}
          </p>
          <div className="pt-2">
            <Link
              href={tenantUrl('/updates')}
              className="inline-block px-4 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors"
            >
              ← Back to All Releases
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(update.release_date || update.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full min-h-screen py-8 md:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Link
            href={tenantUrl('/updates')}
            className="hover:text-primary transition-colors font-medium"
          >
            ← Back to All Releases
          </Link>
          <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
            {update.slug || update.version}
          </span>
        </div>

        {/* Article Card */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium">
                {update.version ? `v${update.version}` : 'Portal Release'}
              </span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
              {update.title}
            </h1>
          </div>

          {/* Description Content */}
          <div
            className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans [&_p]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: update.description }}
          />

          {/* Footer Callout */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Verified deployment for {website?.name || 'campus registry'}</span>
            <Link
              href={tenantUrl('/updates')}
              className="text-primary hover:underline font-medium"
            >
              All Releases →
            </Link>
          </div>
        </article>

        {/* Recent Announcements */}
        {recentUpdates.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Other Recent Releases
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentUpdates.map((rec) => (
                <Link
                  key={rec.id}
                  href={tenantUrl(`/updates/${rec.slug || rec.id}`)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs hover:border-primary/50 transition-colors block"
                >
                  <p className="text-[10px] text-slate-400 mb-1">
                    {new Date(rec.release_date || rec.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {rec.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

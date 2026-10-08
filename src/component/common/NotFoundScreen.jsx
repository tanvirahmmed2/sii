'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

/**
 * Clean, minimalist 404 Not Found Component conforming strictly to STYLE.md.
 * Zero icons, compact rounded radiuses, neutral slate palette.
 */
export default function NotFoundScreen({
  title = 'Page Not Found',
  description = 'The page or resource you are trying to access does not exist, has been removed, or is temporarily unavailable.',
  homeUrl = '/',
  isTenant = false,
}) {
  const router = useRouter();
  const [platformBaseUrl, setPlatformBaseUrl] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host.toLowerCase();
      const envBase = process.env.NEXT_PUBLIC_BASE_URL || '';
      if (envBase) {
        setPlatformBaseUrl(envBase.startsWith('http') ? envBase : `https://${envBase}`);
      } else if (host.includes('localhost')) {
        const port = window.location.port ? `:${window.location.port}` : '';
        setPlatformBaseUrl(`${window.location.protocol}//localhost${port}`);
      } else if (host.includes('127.0.0.1')) {
        const port = window.location.port ? `:${window.location.port}` : '';
        setPlatformBaseUrl(`${window.location.protocol}//127.0.0.1${port}`);
      } else {
        setPlatformBaseUrl(window.location.origin || '/');
      }
    }
  }, []);

  const effectiveHomeUrl = isTenant ? homeUrl : (platformBaseUrl || '/');

  const handleReturnHome = () => {
    if (typeof window !== 'undefined') {
      if (effectiveHomeUrl.startsWith('http')) {
        window.location.href = effectiveHomeUrl;
      } else {
        router.push(effectiveHomeUrl);
      }
    }
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        router.back();
      } else {
        handleReturnHome();
      }
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex items-center justify-center p-4"
      role="main"
      aria-label="404 Page Not Found"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 max-w-sm w-full text-center space-y-4">
        {/* Status pill badge */}
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
            404 Error
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleReturnHome}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
          >
            Return to Homepage
          </button>
          <button
            type="button"
            onClick={handleGoBack}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

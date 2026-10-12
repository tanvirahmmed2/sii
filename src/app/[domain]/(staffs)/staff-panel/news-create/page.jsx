'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiFileText, FiRefreshCw } from 'react-icons/fi';

export default function NewsCreatePage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const [error, setError] = useState(null);

  useEffect(() => {
    async function createDemoNews() {
      try {
        const res = await fetch(`/api/${domain}/staff/panel/news`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_demo: true }),
        });
        const data = await res.json();

        if (data.success && data.news?.slug) {
          router.replace(`/${domain}/staff-panel/news-list/${data.news.slug}`);
        } else {
          setError(data.error || 'Failed to initialize new news article');
        }
      } catch (err) {
        console.error('Create demo news error:', err);
        setError('Network error while initializing news article');
      }
    }

    if (domain) {
      createDemoNews();
    }
  }, [domain, router]);

  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="loader loader-md" />

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
          {error}
        </div>
      )}
    </div>
  );
}

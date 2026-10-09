'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiAward, FiRefreshCw } from 'react-icons/fi';

export default function AwardsCreatePage() {
  const params = useParams();
  const router = useRouter();
  const domain = params?.domain || '';
  const [error, setError] = useState(null);

  useEffect(() => {
    async function createDemoAward() {
      try {
        const res = await fetch(`/api/${domain}/staff/panel/awards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_demo: true }),
        });
        const data = await res.json();

        if (data.success && data.award?.slug) {
          router.replace(`/${domain}/staff-panel/awards-list/${data.award.slug}`);
        } else {
          setError(data.error || 'Failed to initialize new award');
        }
      } catch (err) {
        console.error('Create demo award error:', err);
        setError('Network error while initializing award');
      }
    }

    if (domain) {
      createDemoAward();
    }
  }, [domain, router]);

  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <FiAward className="text-3xl" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <FiRefreshCw className="animate-spin text-sm text-secondary" />
          <span>Initializing New Award Entry...</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Generating draft record and redirecting to the update studio.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
          {error}
        </div>
      )}
    </div>
  );
}

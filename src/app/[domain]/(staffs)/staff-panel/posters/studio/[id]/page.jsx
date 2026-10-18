'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTenantWebsite } from 'src/component/helper/WebsiteContext';
import StaffPosterStudio from 'src/component/staff/StaffPosterStudio';

export default function StaffPosterStudioPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { website, getApiEndpoint } = useTenantWebsite();

  const [loading, setLoading] = useState(true);
  const [poster, setPoster] = useState(null);

  const posterId = params?.id;

  useEffect(() => {
    async function loadPoster() {
      if (!posterId) return;
      setLoading(true);
      try {
        const res = await fetch(getApiEndpoint(`staff/panel/posters/${posterId}`));
        const data = await res.json();
        if (res.ok && data.success && data.poster) {
          setPoster(data.poster);
        } else {
          toast.error(data.error || 'Failed to load poster.');
          router.push('/staff-panel/posters');
        }
      } catch (err) {
        console.error('Error loading poster:', err);
        toast.error('Network error loading poster.');
        router.push('/staff-panel/posters');
      } finally {
        setLoading(false);
      }
    }
    loadPoster();
  }, [posterId, getApiEndpoint, router]);

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-xs uppercase tracking-wider font-semibold animate-pulse text-sky-400">
          Loading Website Poster Studio...
        </div>
      </div>
    );
  }

  return (
    <StaffPosterStudio
      initialPoster={poster}
      onExitUrl="/staff-panel/posters"
    />
  );
}

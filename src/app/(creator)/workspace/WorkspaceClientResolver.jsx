'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkspaceClientResolver() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkCreatorAuth() {
      try {
        const res = await fetch('/api/marketing/creator');
        const data = await res.json();

        if (!isMounted) return;

        if (data.success && data.creator && data.creator.id) {
          router.replace(`/creator/${data.creator.id}/workspace`);
        } else {
          router.replace('/creator/login?redirect=/workspace');
        }
      } catch (err) {
        if (!isMounted) return;
        router.replace('/creator/login?redirect=/workspace');
      }
    }

    checkCreatorAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-xs text-slate-500 font-medium">
      Connecting to workspace...
    </div>
  );
}

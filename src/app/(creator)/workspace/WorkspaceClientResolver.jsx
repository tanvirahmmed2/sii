'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BiLoaderAlt, BiDesktop } from 'react-icons/bi';

export default function WorkspaceClientResolver() {
  const router = useRouter();
  const [error, setError] = useState('');

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
        console.error('Failed to resolve creator workspace session:', err);
        router.replace('/creator/login?redirect=/workspace');
      }
    }

    checkCreatorAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center text-3xl shadow-xs">
        <BiDesktop className="animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Connecting to Workspace...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Verifying your creator credentials and provisioning websites</p>
      </div>
      <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
    </div>
  );
}

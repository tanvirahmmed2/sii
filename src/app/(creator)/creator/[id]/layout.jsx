'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CreatorNavbar from 'src/component/marketing/creator/Navbar';
import CreatorSidebar from 'src/component/marketing/creator/Sidebar';
import LoadingScreen from 'src/component/common/LoadingScreen';

export const CreatorContext = createContext(null);

export function useCreator() {
  const ctx = useContext(CreatorContext);
  if (!ctx) {
    throw new Error('useCreator must be used within a CreatorLayout');
  }
  return ctx;
}

export default function CreatorLayout({ children, params }) {
  const router = useRouter();
  const routeParams = useParams();
  const creatorId = routeParams?.id || (params && typeof params.then !== 'function' ? params.id : null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState({
    creator: null,
    activeSubscription: null,
    pendingSubscription: null,
    subscriptions: [],
    websites: [],
    payments: [],
    purchases: [],
    packages: [],
    tickets: [],
    updates: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const url = creatorId ? `/api/marketing/creator?creatorId=${creatorId}` : '/api/marketing/creator';
      const res = await fetch(url);
      if (res.status === 401) {
        const redirectPath = typeof window !== 'undefined' ? window.location.pathname : (creatorId ? `/creator/${creatorId}` : '/creator/login');
        router.replace(`/creator/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      const json = await res.json();

      if (!res.ok || !json.success) {
        setLoadError(json?.error || 'Failed to load creator workspace data.');
        return;
      }

      if (json.creator) {
        const loggedInId = Number(json.creator.id);
        if ((creatorId && Number(creatorId) !== loggedInId) || json.redirectUrl) {
          router.replace(json.redirectUrl || `/creator/${loggedInId}`);
        }
        setData(json);
      } else {
        router.replace('/creator/login');
      }
    } catch (err) {
      setLoadError('Network connection issue. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [creatorId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loadError) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center text-xs text-slate-700">
        <div className="max-w-sm w-full bg-white border border-slate-200 p-5 rounded space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Workspace Unavailable</h2>
          <p className="text-slate-600 leading-normal">{loadError}</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fetchData()}
              className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => router.replace(creatorId ? `/creator/login?redirect=/creator/${creatorId}` : '/creator/login')}
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen fullScreen={true} label="Loading workspace..." />;
  }

  const effectiveCreatorId = creatorId || data.creator?.id;

  const contextValue = {
    ...data,
    creatorId: effectiveCreatorId,
    refetch: fetchData,
    openCreateWebsiteModal: () => {
      router.push(`/creator/${effectiveCreatorId}/workspace?setup=true`);
    },
  };

  return (
    <CreatorContext.Provider value={contextValue}>
      <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex">
        <CreatorSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          creator={data.creator}
          activeSubscription={data.activeSubscription}
          websites={data.websites}
          stats={data.stats}
        />

        <div className="flex-1 flex flex-col min-w-0 w-full">
          <CreatorNavbar
            creator={data.creator}
            websites={data.websites}
            activeSubscription={data.activeSubscription}
            onToggleSidebar={() => setSidebarOpen((p) => !p)}
            onOpenCreateWebsite={() => {
              router.push(`/creator/${effectiveCreatorId}/workspace?setup=true`);
            }}
          />

          <main className="flex-1 p-4 sm:p-5 w-full space-y-4">
            {children}
          </main>
        </div>
      </div>
    </CreatorContext.Provider>
  );
}

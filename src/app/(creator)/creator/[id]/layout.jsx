'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CreatorNavbar from 'src/component/marketing/creator/Navbar';
import CreatorSidebar from 'src/component/marketing/creator/Sidebar';

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
  const creatorId = routeParams?.id || (params && typeof params.then !== 'function' ? params.id : '1');

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
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New website form state inside modal
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSubdomain, setNewSiteSubdomain] = useState('');
  const [newSiteCustomDomain, setNewSiteCustomDomain] = useState('');
  const [creatingSite, setCreatingSite] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/marketing/creator?creatorId=${creatorId}`);
      if (res.status === 401) {
        const redirectPath = typeof window !== 'undefined' ? window.location.pathname : `/creator/${creatorId}`;
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
        if (Number(creatorId) !== loggedInId || json.redirectUrl) {
          router.replace(json.redirectUrl || `/creator/${loggedInId}`);
        }
        setData(json);
      } else {
        const redirectPath = typeof window !== 'undefined' ? window.location.pathname : `/creator/${creatorId}`;
        router.replace(`/creator/login?redirect=${encodeURIComponent(redirectPath)}`);
      }
    } catch (err) {
      console.error('Error fetching creator data:', err);
      setLoadError('Network connection issue. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [creatorId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateWebsite = async (e) => {
    e.preventDefault();
    setCreatingSite(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const res = await fetch('/api/marketing/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_website',
          creatorId: Number(creatorId),
          name: newSiteName,
          subdomain: newSiteSubdomain,
          customDomain: newSiteCustomDomain || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCreateSuccess(`Website "${json.website.name}" created successfully.`);
        setNewSiteName('');
        setNewSiteSubdomain('');
        setNewSiteCustomDomain('');
        await fetchData();
        setTimeout(() => {
          setCreateModalOpen(false);
          setCreateSuccess('');
        }, 1000);
      } else {
        setCreateError(json.error || 'Failed to create website.');
      }
    } catch (err) {
      setCreateError('Network error while creating website.');
    } finally {
      setCreatingSite(false);
    }
  };

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
              onClick={() => router.replace(`/creator/login?redirect=/creator/${creatorId}`)}
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-500 font-medium">
        Loading workspace...
      </div>
    );
  }

  const contextValue = {
    ...data,
    creatorId,
    refetch: fetchData,
    openCreateWebsiteModal: () => {
      router.push(`/creator/${creatorId}/workspace?setup=true`);
    },
  };

  return (
    <CreatorContext.Provider value={contextValue}>
      <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex">
        {/* Creator Sidebar */}
        <CreatorSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          creator={data.creator}
          activeSubscription={data.activeSubscription}
          websites={data.websites}
          stats={data.stats}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <CreatorNavbar
            creator={data.creator}
            websites={data.websites}
            activeSubscription={data.activeSubscription}
            onToggleSidebar={() => setSidebarOpen((p) => !p)}
            onOpenCreateWebsite={() => {
              router.push(`/creator/${creatorId}/workspace?setup=true`);
            }}
          />

          <main className="flex-1 p-4 sm:p-5 w-full space-y-4">
            {children}
          </main>
        </div>

        {/* Create Website Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
            <div className="max-w-md w-full bg-white border border-slate-200 p-5 rounded space-y-4 text-xs text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold text-slate-900">New Website</h3>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-medium"
                >
                  Close
                </button>
              </div>

              {createError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                  {createSuccess}
                </div>
              )}

              <form onSubmit={handleCreateWebsite} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Website Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="My Portfolio"
                    value={newSiteName}
                    onChange={(e) => {
                      setNewSiteName(e.target.value);
                      if (!newSiteSubdomain) {
                        setNewSiteSubdomain(
                          e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')
                        );
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Subdomain *
                  </label>
                  <div className="flex items-center rounded border border-slate-300 overflow-hidden focus-within:border-slate-800">
                    <input
                      type="text"
                      required
                      placeholder="my-portfolio"
                      value={newSiteSubdomain}
                      onChange={(e) =>
                        setNewSiteSubdomain(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        )
                      }
                      className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                    <span className="px-2 py-1.5 text-[11px] text-slate-500 bg-slate-50 border-l border-slate-200 font-mono">
                      .platform.com
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Custom Domain (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="www.mybrand.com"
                    value={newSiteCustomDomain}
                    onChange={(e) => setNewSiteCustomDomain(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSite}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                  >
                    {creatingSite ? 'Provisioning...' : 'Create Website'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CreatorContext.Provider>
  );
}

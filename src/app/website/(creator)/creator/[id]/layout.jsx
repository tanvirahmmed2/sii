'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CreatorNavbar from '@/components/creator/Navbar';
import CreatorSidebar from '@/components/creator/Sidebar';
import { BiLoaderAlt, BiPlus, BiX, BiDesktop, BiCheckCircle } from 'react-icons/bi';

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
    packages: [],
    tickets: [],
    projects: [],
    updates: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New website form state inside modal
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSubdomain, setNewSiteSubdomain] = useState('');
  const [newSiteCustomDomain, setNewSiteCustomDomain] = useState('');
  const [creatingSite, setCreatingSite] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/creator?creatorId=${creatorId}`);
      const json = await res.json();
      if (json.success && json.creator) {
        if (Number(creatorId) !== json.creator.id) {
          router.push(`/creator/${json.creator.id}`);
          return;
        }
        setData(json);
      } else {
        router.push('/creator/login');
      }
    } catch (err) {
      console.error('Error fetching creator data:', err);
      router.push('/creator/login');
    } finally {
      setLoading(false);
    }
  }, [creatorId, router]);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/creator?creatorId=${creatorId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          if (json.success && json.creator) {
            if (Number(creatorId) !== json.creator.id) {
              router.push(`/creator/${json.creator.id}`);
              return;
            }
            setData(json);
          } else {
            router.push('/creator/login');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Error fetching creator data:', err);
          router.push('/creator/login');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [creatorId, router]);

  const handleCreateWebsite = async (e) => {
    e.preventDefault();
    setCreatingSite(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const res = await fetch('/api/creator', {
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
        setCreateSuccess(`Website "${json.website.name}" created successfully!`);
        setNewSiteName('');
        setNewSiteSubdomain('');
        setNewSiteCustomDomain('');
        await fetchData();
        setTimeout(() => {
          setCreateModalOpen(false);
          setCreateSuccess('');
        }, 1200);
      } else {
        setCreateError(json.error || 'Failed to create website.');
      }
    } catch (err) {
      setCreateError('Network error while creating website.');
    } finally {
      setCreatingSite(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-2 text-slate-800">
        <BiLoaderAlt className="animate-spin text-4xl text-slate-800" />
        <p className="text-slate-600 text-sm font-semibold animate-pulse">
          Loading Creator Workspace...
        </p>
      </div>
    );
  }

  const contextValue = {
    ...data,
    creatorId,
    refetch: fetchData,
    openCreateWebsiteModal: () => {
      setCreateError('');
      setCreateSuccess('');
      setCreateModalOpen(true);
    },
  };

  return (
    <CreatorContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex">
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
        <div className="flex-1 flex flex-col min-w-0">
          <CreatorNavbar
            creator={data.creator}
            websites={data.websites}
            activeSubscription={data.activeSubscription}
            onToggleSidebar={() => setSidebarOpen((p) => !p)}
            onOpenCreateWebsite={() => {
              setCreateError('');
              setCreateSuccess('');
              setCreateModalOpen(true);
            }}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
            {children}
          </main>
        </div>

        {/* Create Website Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="max-w-lg w-full rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl space-y-6 relative text-slate-800">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <BiX className="text-2xl" />
              </button>

              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
                  <BiDesktop className="text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 pt-2">Create New Portfolio Website</h3>
                <p className="text-xs text-slate-500">
                  Provision a brand-new website instance with instant edge subdomain hosting.
                </p>
              </div>

              {createError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <BiCheckCircle className="text-lg" />
                  <span>{createSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateWebsite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Website Name / Brand Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Alex Vance Design Studio"
                    value={newSiteName}
                    onChange={(e) => {
                      setNewSiteName(e.target.value);
                      if (!newSiteSubdomain) {
                        setNewSiteSubdomain(
                          e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')
                        );
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Desired Subdomain *
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 overflow-hidden focus-within:border-slate-800">
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
                      className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none"
                    />
                    <span className="px-3 py-2.5 text-xs text-slate-500 bg-slate-100 font-mono border-l border-slate-200">
                      .platform.com
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Lowercase letters, numbers, and dashes only.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Custom Domain (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., www.mybrand.com"
                    value={newSiteCustomDomain}
                    onChange={(e) => setNewSiteCustomDomain(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSite}
                    className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {creatingSite ? (
                      <>
                        <BiLoaderAlt className="animate-spin text-base" />
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <>
                        <BiPlus className="text-base" />
                        <span>Launch Website</span>
                      </>
                    )}
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

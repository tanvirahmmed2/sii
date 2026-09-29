'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { BiSearch, BiGridAlt, BiRefresh, BiRocket, BiRightArrowAlt, BiStar } from 'react-icons/bi';
import HomeAppCard from '@/components/home/cards/AppCard';

export default function AppsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchPublishedApps = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/apps');
      if (res.data?.success && Array.isArray(res.data?.apps)) {
        setApps(res.data.apps);
      } else {
        setError(res.data?.error || 'Failed to load applications.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error fetching ecosystem applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    axios
      .get('/api/apps')
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && Array.isArray(res.data?.apps)) {
          setApps(res.data.apps);
        } else {
          setError(res.data?.error || 'Failed to load applications.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.response?.data?.error || err.message || 'Error fetching ecosystem applications.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredApps = apps.filter((app) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (app.title || '').toLowerCase().includes(q) ||
      (app.short_description || '').toLowerCase().includes(q) ||
      (app.slug || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50/60 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-primary text-white pt-20 pb-20 px-4 lg:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-4">
          

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
            Turnkey Website Built for{' '}
            Modern Creators
          </h1>

          <p className="text-sm sm:text-base  max-w-2xl mx-auto leading-relaxed">
            Expand your portfolio with pre-integrated storefronts, reservation systems, LMS modules, and custom platform applications ready to deploy.
          </p>

          {/* Search Bar */}
          <div className="pt-6 max-w-xl mx-auto">
            <div className="relative">
              <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2  text-lg" />
              <input
                type="text"
                placeholder="Search apps by title, capability, or use case..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:bg-white/15 transition-all shadow-lg backdrop-blur-md"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold  hover:text-white px-2 py-1 rounded-md bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Apps Directory Grid */}
      <section className="w-full px-4 lg:px-8 pt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BiGridAlt className="text-primary text-2xl" /> Available Applications
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredApps.length} active application{filteredApps.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPublishedApps}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <BiRefresh className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchPublishedApps}
              className="text-rose-600 hover:underline font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-pulse space-y-4"
              >
                <div className="aspect-16/10 bg-slate-100 rounded-2xl" />
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-slate-100 rounded-md w-full" />
                  <div className="h-3 bg-slate-100 rounded-md w-5/6" />
                </div>
                <div className="h-9 bg-slate-100 rounded-xl w-full pt-4" />
              </div>
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center my-8 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-4">
              <BiGridAlt />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search ? 'No Matching Applications' : 'No Published Applications Found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No apps matched "${search}". Try checking for typos or searching a different term.`
                : 'Applications published in the developer portal will appear here.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* Apps Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {filteredApps.map((app) => (
              <HomeAppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </section>

      {/* Creator Call To Action */}
      <section className="w-full px-4 lg:px-8 mt-20">
        <div className="bg-linear-to-r from-slate-900 to-slate-950 rounded-3xl p-8 sm:p-12 text-white border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="text-2xl font-semibold tracking-tight">
              Ready to deploy your customized application?
            </h3>
            <p className="text-xs sm:text-sm  leading-relaxed">
              Create your account in seconds, connect your custom domain, and launch a complete online presence.
            </p>
          </div>
          <Link
            href="/creator/login"
            className="px-6 py-3.5 rounded-2xl bg-secondary hover:bg-secondary-dark text-white font-semibold text-sm shadow-xl flex items-center gap-2 shrink-0 transition-all hover:scale-105 cursor-pointer"
          >
            <span>Get Started Now</span>
            <BiRightArrowAlt className="text-lg" />
          </Link>
        </div>
      </section>
    </main>
  );
}

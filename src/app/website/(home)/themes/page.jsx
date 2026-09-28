'use client';

import { useState, useEffect, useMemo } from 'react';
import { BiPalette, BiSearch, BiGridAlt, BiLayer, BiRefresh } from 'react-icons/bi';
import Theme from '@/components/home/cards/Theme';

export default function ThemesPage() {
  const [themes, setThemes] = useState([]);
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchThemesAndApps = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/themes');
      const data = await res.json();
      if (data.success) {
        setThemes(data.themes || []);
        setApps(data.apps || []);
      }
    } catch (err) {
      console.error('Failed to load themes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemesAndApps();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('app') || params.get('app_id');
      if (q) setSelectedApp(q);
    }
  }, []);

  // Filter themes based on selected App and search keyword
  const filteredThemes = useMemo(() => {
    return themes.filter((t) => {
      const matchApp =
        selectedApp === 'ALL'
          ? true
          : selectedApp === 'UNASSIGNED'
          ? !t.app_id
          : String(t.app_id) === String(selectedApp) || t.app_slug === selectedApp;

      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.app_title?.toLowerCase().includes(q);

      return matchApp && matchSearch;
    });
  }, [themes, selectedApp, search]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-14 md:py-20 space-y-12">
      {/* Header Section */}
      <div className="text-center max-w-6xl mx-auto space-y-4">
        

        <h1 className="text-3xl sm:text-5xl font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
          Visual Themes Categorized by Application
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Explore production-ready design templates tailored for your specific platform applications. Seamlessly activate them across your creator websites with 1-click.
        </p>

        {/* Search bar */}
        <div className="pt-3 max-w-md mx-auto">
          <div className="relative">
            <BiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search themes by name, style, or application..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-xs"
            />
          </div>
        </div>

        {/* App Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setSelectedApp('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedApp === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BiGridAlt className="text-sm" />
            <span>All Applications</span>
            <span className="text-[10px] opacity-75 ml-1">({themes.length})</span>
          </button>

          {apps.map((app) => {
            const count = themes.filter((t) => String(t.app_id) === String(app.id)).length;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedApp(String(app.id))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedApp === String(app.id)
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BiLayer className="text-sm" />
                <span>{app.title}</span>
                <span className="text-[10px] opacity-75 ml-0.5">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Themes Grid / Status */}
      {loading ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-indigo-600 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Loading platform themes...</p>
        </div>
      ) : filteredThemes.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 flex items-center justify-center text-indigo-500 text-3xl">
            <BiPalette />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            No themes available
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {search || selectedApp !== 'ALL'
              ? 'No themes match the selected application or search query. Try switching categories or clearing search filters.'
              : 'No design themes have been published to the platform database yet.'}
          </p>
          {(search || selectedApp !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedApp('ALL');
                setSearch('');
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
            <span>
              Showing {filteredThemes.length} of {themes.length} themes
            </span>
            <button
              type="button"
              onClick={fetchThemesAndApps}
              className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <BiRefresh className="text-sm" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredThemes.map((t) => (
              <Theme key={t.id} theme={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

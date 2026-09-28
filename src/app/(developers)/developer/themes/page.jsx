'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BiSearch,
  BiPlus,
  BiTrash,
  BiRefresh,
  BiEdit,
  BiLoaderAlt,
  BiPalette,
  BiX,
  BiImage,
  BiCheckCircle,
} from 'react-icons/bi';

export default function AdminThemesPage() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PREMIUM' | 'DISABLED'
  const [deletingId, setDeletingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreateDefaultTheme = async () => {
    if (creating) return;
    try {
      setCreating(true);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const res = await fetch('/api/developer/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Untitled Theme',
          title: 'Untitled Theme',
          slug: `untitled-theme-${randomSuffix}`,
          category: 'Modern',
          is_active: false,
          is_premium: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.record?.slug) {
        router.push(`/developer/themes/${data.record.slug}`);
      } else {
        alert(data.error || 'Failed to create theme.');
        setCreating(false);
      }
    } catch (e) {
      alert(e.message || 'Error creating theme.');
      setCreating(false);
    }
  };

  const fetchThemes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/themes');
      const data = await res.json();
      if (data.success) {
        setThemes(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/developer/themes')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setThemes(data.records || []);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        console.error(e);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name || 'this theme'}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/developer/themes?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setThemes((prev) => prev.filter((t) => t.id !== id));
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = themes.filter((t) => {
    if (filterTab === 'ACTIVE' && t.is_active === false) return false;
    if (filterTab === 'DISABLED' && t.is_active !== false) return false;
    if (filterTab === 'PREMIUM' && !t.is_premium) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.app_title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Platform Themes &amp; Templates
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Themes
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Gallery of pre-styled portfolio builder themes, layouts, and typography presets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchThemes}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh themes"
            aria-label="Refresh"
          >
            <BiRefresh className="text-lg" />
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={handleCreateDefaultTheme}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer disabled:opacity-60 shrink-0"
            title="Create Theme"
          >
            {creating ? <BiLoaderAlt className="animate-spin text-base" /> : <BiPlus className="text-base" />}
            <span>{creating ? 'Creating...' : 'Create Theme'}</span>
          </button>
        </div>
      </div>

      {/* Main List Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full max-w-full">
        {/* Search & Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-72 md:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search themes by name, category, or app..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <BiX className="text-sm" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto shrink-0 overflow-x-auto">
            {[
              { key: 'ALL', label: `All (${themes.length})` },
              { key: 'ACTIVE', label: `Active (${themes.filter((t) => t.is_active !== false).length})` },
              { key: 'PREMIUM', label: `Premium (${themes.filter((t) => t.is_premium).length})` },
              { key: 'DISABLED', label: `Disabled (${themes.filter((t) => t.is_active === false).length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center whitespace-nowrap ${
                  filterTab === tab.key
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive View List (Strictly zero horizontal overflow) */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-14 shrink-0">Preview</span>
            <span className="flex-1 min-w-0">Theme Name &amp; Category</span>
            <span className="w-28 shrink-0 hidden lg:block">Application</span>
            <span className="w-24 shrink-0 text-center hidden md:block">Tier</span>
            <span className="w-20 shrink-0 text-center">Status</span>
            <span className="w-20 shrink-0 text-center hidden sm:block">Date</span>
            <span className="w-20 shrink-0 text-right">Actions</span>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-semibold">Loading platform themes...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiPalette />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Themes Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No themes matched "${searchTerm}". Try a different keyword.`
                  : filterTab !== 'ALL'
                  ? `No themes found in the ${filterTab.toLowerCase()} filter.`
                  : 'Start adding portfolio themes and layout designs.'}
              </p>
              {!searchTerm && filterTab === 'ALL' && (
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreateDefaultTheme}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer mt-2 disabled:opacity-60"
                >
                  <BiPlus />
                  <span>Create First Theme</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {filtered.map((t) => {
                const formattedDate = t.created_at
                  ? new Date(t.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—';

                return (
                  <div
                    key={t.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID */}
                    <span className="w-8 shrink-0 font-mono font-bold text-[11px] text-slate-400 hidden md:block">
                      #{t.id}
                    </span>

                    {/* Preview Image */}
                    <div className="w-12 h-9 sm:w-14 sm:h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative flex items-center justify-center">
                      {t.preview_image ? (
                        <Image
                          src={t.preview_image}
                          alt={t.name || 'Preview'}
                          width={80}
                          height={60}
                          unoptimized
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <BiImage className="text-slate-300 text-base" />
                      )}
                    </div>

                    {/* Title & Details */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link
                          href={`/developer/themes/${t.slug}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-secondary truncate block tracking-tight"
                          title={t.name}
                        >
                          {t.name}
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {t.category || 'Modern'}
                        </span>
                        {t.is_premium && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded md:hidden">
                            ★ Premium
                          </span>
                        )}
                        {t.app_title && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded lg:hidden">
                            {t.app_title}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Application column (Large screens) */}
                    <div className="w-28 shrink-0 hidden lg:block text-left min-w-0">
                      {t.app_title ? (
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded truncate inline-block max-w-full">
                          {t.app_title}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">General</span>
                      )}
                    </div>

                    {/* Tier Column (Desktop) */}
                    <div className="w-24 shrink-0 text-center hidden md:block">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.is_premium
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {t.is_premium ? '★ Premium' : 'Standard'}
                      </span>
                    </div>

                    {/* Status Column */}
                    <div className="w-20 shrink-0 text-center">
                      <span
                        className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="hidden sm:inline">
                          {t.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </span>
                    </div>

                    {/* Date Column (Tablet/Desktop) */}
                    <div className="w-20 shrink-0 text-center hidden sm:block">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actions Column */}
                    <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                      <Link
                        href={`/developer/themes/${t.slug}`}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-secondary hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Edit theme in workspace"
                      >
                        <BiEdit className="text-sm" />
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === t.id}
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete theme"
                      >
                        {deletingId === t.id ? (
                          <BiLoaderAlt className="animate-spin text-sm" />
                        ) : (
                          <BiTrash className="text-sm" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

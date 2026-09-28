'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import {
  BiGridAlt,
  BiSearch,
  BiCheckCircle,
  BiLinkExternal,
  BiPlus,
  BiTrash,
  BiEdit,
  BiTimeFive,
  BiRefresh,
  BiImage,
  BiLoaderAlt,
  BiShieldQuarter,
  BiLayer,
  BiX,
} from 'react-icons/bi';
import { Context } from '@/components/helper/Context';

export default function DeveloperAppsPage() {
  const { user } = useContext(Context);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFTS'
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes('apps');
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreateDefaultApp = async () => {
    if (!canManage || creating) return;
    try {
      setCreating(true);
      setActionError('');
      const res = await axios.post('/api/developer/apps', {
        title: 'Untitled App',
        is_published: false,
      });
      if (res.data?.success && (res.data.app || res.data.record)) {
        const newApp = res.data.app || res.data.record;
        router.push(`/developer/apps/${newApp.slug}`);
      } else {
        setActionError(res.data?.error || 'Failed to create application.');
        setCreating(false);
      }
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Error creating application.');
      setCreating(false);
    }
  };

  const fetchApps = async () => {
    try {
      setLoading(true);
      setActionError('');
      const res = await axios.get('/api/developer/apps');
      if (res.data?.success) {
        setApps(res.data.records || []);
      } else {
        setActionError(res.data?.error || 'Failed to fetch applications.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Error loading ecosystem apps.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    axios
      .get('/api/developer/apps')
      .then((res) => {
        if (!active) return;
        if (res.data?.success) {
          setApps(res.data.records || []);
        } else {
          setActionError(res.data?.error || 'Failed to fetch applications.');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setActionError(err.response?.data?.error || err.message || 'Error loading ecosystem apps.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Delete App
  const handleDeleteApp = async (id, title) => {
    if (!canManage) return;
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    setDeletingId(id);
    setActionError('');

    try {
      const res = await axios.delete(`/api/developer/apps?id=${id}`);
      if (res.data?.success) {
        setApps((prev) => prev.filter((a) => a.id !== id));
      } else {
        setActionError(res.data?.error || 'Failed to delete application.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Error deleting application.');
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle publish status inline
  const handleTogglePublish = async (app) => {
    if (!canManage) return;
    setTogglingId(app.id);
    setActionError('');
    const newStatus = !app.is_published;

    try {
      const res = await axios.put('/api/developer/apps', {
        id: app.id,
        is_published: newStatus,
      });

      if (res.data?.success && res.data?.record) {
        setApps((prev) => prev.map((a) => (a.id === app.id ? res.data.record : a)));
      } else {
        setActionError(res.data?.error || 'Failed to toggle publishing status.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error || err.message || 'Error updating status.');
    } finally {
      setTogglingId(null);
    }
  };

  // Filter apps
  const filteredApps = apps.filter((app) => {
    if (filterTab === 'PUBLISHED' && !app.is_published) return false;
    if (filterTab === 'DRAFTS' && app.is_published) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (app.title || '').toLowerCase().includes(q) ||
      (app.slug || '').toLowerCase().includes(q) ||
      (app.short_description || '').toLowerCase().includes(q) ||
      (app.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs w-full max-w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Platform Ecosystem Apps
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              Ecosystem
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">
            Catalog of plug-and-play vertical applications and integrations. Admin and Manager roles can manage, draft, and publish apps.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchApps}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh list"
            aria-label="Refresh list"
          >
            <BiRefresh className="text-lg" />
          </button>

          {canManage ? (
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateDefaultApp}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs bg-secondary hover:bg-secondary-dark text-white cursor-pointer disabled:opacity-60 shrink-0"
              title="Create New Application"
            >
              {creating ? <BiLoaderAlt className="animate-spin text-base" /> : <BiPlus className="text-base" />}
              <span>{creating ? 'Creating...' : 'Create App'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <BiShieldQuarter className="text-sm text-slate-400" />
              <span>Read Only</span>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-2 w-full">
          <span className="truncate">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-rose-500 hover:text-rose-800 shrink-0 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full max-w-full">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 w-full">
          {/* Search Field */}
          <div className="relative w-full sm:w-72 md:w-80">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search apps by title or description..."
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
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto shrink-0">
            {[
              { key: 'ALL', label: `All (${apps.length})` },
              { key: 'PUBLISHED', label: `Published (${apps.filter((a) => a.is_published).length})` },
              { key: 'DRAFTS', label: `Drafts (${apps.filter((a) => !a.is_published).length})` },
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

        {/* ========================================================================= */}
        {/* Responsive View List (Zero Horizontal Overflow) */}
        {/* ========================================================================= */}
        <div className="w-full max-w-full overflow-hidden">
          {/* Header Row (Hidden on small screens) */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <span className="w-8 shrink-0">#</span>
            <span className="w-14 shrink-0">Icon</span>
            <span className="flex-1 min-w-0">Application Title &amp; Details</span>
            <span className="w-28 shrink-0 hidden lg:block text-center">Linked Modules</span>
            <span className="w-16 shrink-0 text-center hidden md:block">Gallery</span>
            <span className="w-24 shrink-0 text-center">Status</span>
            <span className="w-24 shrink-0 text-right">Actions</span>
          </div>

          {/* List Items */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <BiLoaderAlt className="animate-spin text-2xl text-secondary" />
              <span className="text-xs font-semibold">Loading applications catalog...</span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                <BiGridAlt />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Applications Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchTerm
                  ? `No apps matched "${searchTerm}". Try a different keyword.`
                  : filterTab !== 'ALL'
                  ? `No apps found in the ${filterTab.toLowerCase()} filter.`
                  : 'Start adding modular applications to the platform.'}
              </p>
              {canManage && !searchTerm && filterTab === 'ALL' && (
                <button
                  type="button"
                  onClick={handleCreateDefaultApp}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary-dark transition-colors cursor-pointer mt-2"
                >
                  <BiPlus />
                  <span>Create First App</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 w-full">
              {filteredApps.map((app) => {
                const images = Array.isArray(app.images) ? app.images : [];
                const primaryImage = images[0]?.image || images[0]?.url || null;
                const modules = Array.isArray(app.modules) ? app.modules : [];
                const isBeingToggled = togglingId === app.id;

                const snippet = app.short_description
                  ? app.short_description
                  : app.description
                  ? app.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                  : '';

                return (
                  <div
                    key={app.id}
                    className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center gap-2.5 sm:gap-3 w-full min-w-0 overflow-hidden"
                  >
                    {/* ID (hidden on mobile) */}
                    <span className="w-8 shrink-0 font-mono font-bold text-[11px] text-slate-400 hidden md:block">
                      #{app.id}
                    </span>

                    {/* App Icon/Thumbnail */}
                    <div className="w-12 h-9 sm:w-14 sm:h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative flex items-center justify-center">
                      {primaryImage ? (
                        <Image
                          src={primaryImage}
                          alt={app.title || 'App Icon'}
                          width={80}
                          height={60}
                          unoptimized
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <BiGridAlt className="text-slate-400 text-base" />
                      )}
                    </div>

                    {/* Title & Details (flex-1 min-w-0 with truncate to prevent overflow) */}
                    <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link
                          href={`/developer/apps/${app.slug}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-secondary truncate block tracking-tight"
                          title={app.title}
                        >
                          {app.title}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
                        {snippet && (
                          <span className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                            {snippet}
                          </span>
                        )}

                        {/* Inline modules pill on smaller screens */}
                        {modules.length > 0 && (
                          <span className="inline-flex lg:hidden items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 truncate shrink-0">
                            <BiLayer className="text-[10px]" />
                            <span>{modules.length} mod</span>
                          </span>
                        )}

                        {/* Inline gallery count on smaller screens */}
                        {images.length > 0 && (
                          <span className="inline-flex md:hidden items-center gap-0.5 text-[10px] text-slate-500 shrink-0">
                            <BiImage className="text-xs text-slate-400" />
                            <span>{images.length}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Modules Count (Hidden on < lg) */}
                    <div className="w-28 shrink-0 hidden lg:flex items-center justify-center gap-1 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold">
                        <BiLayer className="text-xs text-secondary" />
                        <span>{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
                      </span>
                    </div>

                    {/* Gallery Count (Hidden on < md) */}
                    <div className="w-16 shrink-0 hidden md:flex items-center justify-center gap-1 text-[11px] text-slate-500">
                      <BiImage className="text-sm text-slate-400" />
                      <span>{images.length}</span>
                    </div>

                    {/* Status Badge Toggle (Visible on all screens) */}
                    <div className="shrink-0">
                      {canManage ? (
                        <button
                          type="button"
                          disabled={isBeingToggled}
                          onClick={() => handleTogglePublish(app)}
                          className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            app.is_published
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Click to toggle publish status"
                        >
                          {isBeingToggled ? (
                            <BiLoaderAlt className="animate-spin text-xs" />
                          ) : app.is_published ? (
                            <BiCheckCircle className="text-xs" />
                          ) : (
                            <BiTimeFive className="text-xs" />
                          )}
                          <span className="hidden sm:inline">
                            {app.is_published ? 'Published' : 'Draft'}
                          </span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            app.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {app.is_published ? 'Published' : 'Draft'}
                        </span>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="shrink-0 flex items-center justify-end gap-0.5 sm:gap-1">
                      {/* Public view if published */}
                      {app.slug && (
                        <Link
                          href={`/apps/${app.slug}`}
                          target="_blank"
                          className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-slate-100 transition-colors"
                          title="View public app page"
                          aria-label="View public app page"
                        >
                          <BiLinkExternal className="text-base" />
                        </Link>
                      )}

                      {/* Edit app */}
                      <Link
                        href={`/developer/apps/${app.slug}`}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-secondary hover:bg-secondary/10 transition-colors"
                        title="Edit app in workspace"
                        aria-label="Edit app"
                      >
                        <BiEdit className="text-base" />
                      </Link>

                      {/* Delete app */}
                      {canManage && (
                        <button
                          type="button"
                          disabled={deletingId === app.id}
                          onClick={() => handleDeleteApp(app.id, app.title)}
                          className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete app"
                          aria-label="Delete app"
                        >
                          {deletingId === app.id ? (
                            <BiLoaderAlt className="animate-spin text-base" />
                          ) : (
                            <BiTrash className="text-base" />
                          )}
                        </button>
                      )}
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
